import * as tf from '@tensorflow/tfjs-node';

class DeepNeuralNetwork {
    destinationBranch: tf.LayersModel;
    preferenceBranch: tf.LayersModel;
    combined: tf.Layer;
    dense1: tf.Layer;
    dense2: tf.Layer;
    dense3: tf.Layer;
    output: tf.Layer;
    dropout: tf.Layer;

    constructor(inputShapes: number[], numActions: number) {
        this.destinationBranch = this.createBranch(inputShapes[0], 'destination');
        this.preferenceBranch = this.createBranch(inputShapes[1], 'preference');
        this.combined = tf.layers.concatenate();
        this.dense1 = tf.layers.dense({ units: 512, activation: 'relu', name: 'dense1' });
        this.dense2 = tf.layers.dense({ units: 256, activation: 'relu', name: 'dense2' });
        this.dense3 = tf.layers.dense({ units: 128, activation: 'relu', name: 'dense3' });
        this.output = tf.layers.dense({ units: numActions, name: 'output' });
        this.dropout = tf.layers.dropout({ rate: 0.2 });
    }

    createBranch(inputDim: number, name: string): tf.LayersModel {
        return tf.sequential({
            layers: [
                tf.layers.dense({ units: 128, activation: 'relu', inputShape: [inputDim], name: `${name}_dense1` }),
                tf.layers.batchNormalization({ name: `${name}_bn1` }),
                tf.layers.dense({ units: 64, activation: 'relu', name: `${name}_dense2` }),
                tf.layers.batchNormalization({ name: `${name}_bn2` }),
                tf.layers.dense({ units: 32, activation: 'relu', name: `${name}_dense3` }),
                tf.layers.batchNormalization({ name: `${name}_bn3` }),
            ],
            name: `${name}_branch`,
        });
    }

    call(inputs: tf.Tensor[], training: boolean = false): tf.Tensor {
        const [dest, pref] = inputs;
        const x1 = this.destinationBranch.apply(dest) as tf.Tensor;
        const x2 = this.preferenceBranch.apply(pref) as tf.Tensor;
        const combined = this.combined.apply([x1, x2]) as tf.Tensor;
        let x = this.dense1.apply(combined) as tf.Tensor;
        x = this.dropout.apply(x, { training }) as tf.Tensor;
        x = this.dense2.apply(x) as tf.Tensor;
        x = this.dropout.apply(x, { training }) as tf.Tensor;
        x = this.dense3.apply(x) as tf.Tensor;
        return this.output.apply(x) as tf.Tensor;
    }
}