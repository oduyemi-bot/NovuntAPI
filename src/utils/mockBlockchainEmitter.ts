import EventEmitter from "events";

class MockBlockchainEmitter extends EventEmitter {}

const mockBlockchainEmitter = new MockBlockchainEmitter();

export default mockBlockchainEmitter;
