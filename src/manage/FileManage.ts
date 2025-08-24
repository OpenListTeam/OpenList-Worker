import * as fsd from './FileDriver'

let path_map: Record<string, any> = {
    "/path/": {
        "enableFlag": true,
        "driverName": "cloud189",
        "cachedTime": 0,
        "configData": {
            "phones": "",
            "passwd": "",
            "rootid": "-11"
        },
        "serverData": {
            "cookie": ""
        }
    }
}

export async function loadDriver(now_path: string) {
    for (const map_path in path_map) {
        console.log(now_path, map_path);
        if (now_path.startsWith(map_path)) {
            const sub_path: string = now_path.substring(map_path.length - 1);
            let now_conn: fsd.FileDriver = new fsd.FileDriver(
                path_map[map_path]['enableFlag'],
                path_map[map_path]['driverName'],
                path_map[map_path]['cachedTime'],
                path_map[map_path]['configData'],
                path_map[map_path]['serverData'],
            )
            await now_conn.InitDriver();
            await now_conn.driverConn.newLogin()
            let now_list = await now_conn.driverConn.listFile(sub_path)
            console.log(now_list)
        }
    }
}