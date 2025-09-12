import * as fsd from '../drive/FileDriver'

export async function mountDriver(c, now_path: string) {
    for (const map_path in path_map) {
        console.log(now_path, map_path);
        if (now_path.startsWith(map_path)) {
            console.log(path_map[map_path]['driverName']);
            const sub_path: string = now_path.substring(map_path.length - 1);
            let now_conn: fsd.FileDriver = new fsd.FileDriver(
                c, now_path,
                path_map[map_path]['enableFlag'],
                path_map[map_path]['driverName'],
                path_map[map_path]['cachedTime'],
                path_map[map_path]['configData'],
                path_map[map_path]['serverData'],
            )
            await now_conn.InitDriver();
            let now_list = await now_conn.driverConn.listFile(sub_path)
            // await now_conn.driverConn.loadSelf()
            // await now_conn.driverConn.downFile(sub_path)
            // await now_conn.driverConn.killFile(sub_path)
            console.log(now_list)
        }
    }
}