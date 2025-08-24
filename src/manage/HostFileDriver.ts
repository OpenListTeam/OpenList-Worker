import {FileInfo} from "./object";

let path_map = {
    "/path/": {
        "Driver": "cloud189",
        "Enable": true,
        "Cached": 0,
    }
}

class HostInfoDriver {
    constructor(
        public Enable: boolean,
        public Driver: string,
        public Buffer: number,
        public Config: Record<string, any>
    ) {
    }
}

class HostFileDriver {
    constructor() {

    }
    InitDriver(){

    }
}