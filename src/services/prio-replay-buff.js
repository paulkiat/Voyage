import { Deque } from 'double-ended-queue';

class PrioritizedReplayBuffer {
    buffer: Deque<any>;
    priorities: Deque<number>;
    alpha: number;
    beta: number;
    epsilon: number;
    maxPriority: number;

    constructor(maxSize: number, alpha: number = 0.6, beta: number = 0.4) {
        this.buffer = new Deque(maxSize);
        this.priorities = new Deque(maxSize);
        this.alpha = alpha;
        this.beta = beta;
        this.epsilon = 1e-6;
        this.maxPriority = 1.0;
    }

    add(experience: any): void {
        this.buffer.push(experience);
        this.priorities.push(this.maxPriority);
    }

    sample(batchSize: number): [any[], number[], number[]] {
        const priorities = this.priorities.toArray();
        const prob = priorities.map((p) => Math.pow(p, this.alpha));
        const totalProb = prob.reduce((a, b) => a + b, 0);
        const probs = prob.map((p) => p / totalProb);
        const indices = tf.multinomial(tf.tensor(probs), batchSize).arraySync();
        const samples = indices.map((i) => this.buffer.get(i));
        const weights = indices.map((i) => Math.pow(this.buffer.length * probs[i], -this.beta));
        return [samples, indices, weights];
    }

    updatePriorities(indices: number[], tdErrors: number[]): void {
        indices.forEach((index, i) => {
            this.priorities.set(index, Math.pow(Math.abs(tdErrors[i]) + this.epsilon, this.alpha));
            this.maxPriority = Math.max(this.maxPriority, this.priorities.get(index));
        });
    }
}