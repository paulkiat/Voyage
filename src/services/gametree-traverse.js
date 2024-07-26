import * as tf from '@tensorflow/tfjs-node';

class GameTreeTraversal {
    model: tf.LayersModel;
    memory: PrioritizedReplayBuffer;
    env: any;

    constructor(model: tf.LayersModel, memory: PrioritizedReplayBuffer, env: any) {
        this.model = model;
        this.memory = memory;
        this.env = env;
    }

    traverse(numTraversals: number): void {
        for (let i = 0; i < numTraversals; i++) {
            let state = this.env.reset();
            let done = false;
            while (!done) {
                let action: number;
                if (Math.random() < EPSILON) {
                    action = this.env.action_space.sample();
                } else {
                    const qValues = this.model.predict(tf.tensor(state).expandDims(0)) as tf.Tensor;
                    action = tf.argMax(qValues, 1).dataSync()[0];
                }

                const [nextState, reward, doneFlag, _] = this.env.step(action);
                this.memory.add([state, action, reward, nextState, doneFlag]);
                state = nextState;
                done = doneFlag;
            }
        }
    }

    externalSampling(state: any, depth: number): tf.Tensor {
        if (depth === 0 || this.env.is_terminal(state)) {
            return this.model.predict(tf.tensor(state).expandDims(0)) as tf.Tensor;
        }

        const action = this.env.action_space.sample();
        const [nextState, reward, done, _] = this.env.step(action);
        const qValues = tf.add(tf.scalar(reward), tf.mul(tf.scalar(GAMMA), this.externalSampling(nextState, depth - 1)));

        return qValues;
    }
}