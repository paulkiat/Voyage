class Evaluator {
    env: any;

    constructor(env: any) {
        this.env = env;
    }

    calculateExploitability(model: tf.LayersModel, numEpisodes: number = 1000): number {
        let totalReward = 0;
        for (let i = 0; i < numEpisodes; i++) {
            let state = this.env.reset();
            let done = false;
            while (!done) {
                const qValues = model.predict(tf.tensor(state).expandDims(0)) as tf.Tensor;
                const action = tf.argMax(qValues, 1).dataSync()[0];
                const [nextState, reward, doneFlag, _] = this.env.step(action);
                totalReward += reward;
                state = nextState;
                done = doneFlag;
            }
        }
        return totalReward / numEpisodes;
    }

    compareToBaseline(model: tf.LayersModel, baselineModel: tf.LayersModel, numEpisodes: number = 1000): number {
        const modelReward = this.calculateExploitability(model, numEpisodes);
        const baselineReward = this.calculateExploitability(baselineModel, numEpisodes);
        return modelReward - baselineReward;
    }
}