import * as tf from '@tensorflow/tfjs-node';

class LinearCFR {
    model: tf.LayersModel;
    memory: PrioritizedReplayBuffer;
    optimizer: tf.Optimizer;
    targetModel: tf.LayersModel;

    constructor(model: tf.LayersModel, memory: PrioritizedReplayBuffer, optimizer: tf.Optimizer) {
        this.model = model;
        this.memory = memory;
        this.optimizer = optimizer;
        this.targetModel = tf.models.cloneModel(model);
        this.targetModel.setWeights(model.getWeights());
    }

    async train(numIterations: number): Promise<number> {
        let lossValue = 0;
        for (let t = 1; t <= numIterations; t++) {
            const [samples, indices, weights] = this.memory.sample(BATCH_SIZE);
            const states = samples.map((sample) => sample[0]);
            const actions = samples.map((sample) => sample[1]);
            const rewards = samples.map((sample) => sample[2]);
            const nextStates = samples.map((sample) => sample[3]);
            const dones = samples.map((sample) => sample[4]);

            const statesTensor = tf.tensor(states);
            const nextStatesTensor = tf.tensor(nextStates);
            const rewardsTensor = tf.tensor(rewards);
            const actionsTensor = tf.tensor(actions, [BATCH_SIZE], 'int32');
            const donesTensor = tf.tensor(dones, [BATCH_SIZE], 'bool');
            const weightsTensor = tf.tensor(weights);

            const tape = await tf.variableGrads(() => {
                const qValues = this.model.predict(statesTensor) as tf.Tensor;
                const nextQValues = this.targetModel.predict(nextStatesTensor) as tf.Tensor;
                const targetQValues = tf.add(
                    rewardsTensor,
                    tf.mul(tf.scalar(1).sub(donesTensor), tf.mul(tf.scalar(GAMMA), tf.max(nextQValues, 1)))
                );

                const masks = tf.oneHot(actionsTensor, this.model.outputShape[1]);
                const qAction = tf.sum(tf.mul(qValues, masks), 1);

                const tdErrors = tf.sub(targetQValues, qAction);
                const loss = tf.mean(tf.mul(weightsTensor, tf.square(tdErrors)));
                return loss;
            });

            const grads = tape.grads;
            const clippedGrads = tf.clipByValue(grads, -5.0, 5.0);
            this.optimizer.applyGradients(clippedGrads);

            this.memory.updatePriorities(indices, tdErrors.arraySync());

            if (t % 100 === 0) {
                this.targetModel.setWeights(this.model.getWeights());
            }

            lossValue = tape.value;
        }

        return lossValue;
    }
}