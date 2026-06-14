export class DisposalQueue {
    constructor(maxPerFrame = 3) {
        this.queue = [];
        this.maxPerFrame = maxPerFrame;
    }

    enqueue(disposeFn) {
        if (typeof disposeFn === 'function') {
            this.queue.push(disposeFn);
        }
    }

    process() {
        const count = Math.min(this.maxPerFrame, this.queue.length);
        for (let i = 0; i < count; i++) {
            const disposeFn = this.queue.shift();
            disposeFn();
        }
    }

    flush() {
        while (this.queue.length > 0) {
            const disposeFn = this.queue.shift();
            disposeFn();
        }
    }

    get pendingCount() {
        return this.queue.length;
    }
}
