import { Guild } from 'discord.js';
import { Connection } from './Connection';

const ConnectionList = new class {
    connections: Map<string, Connection> = new Map<string, Connection>();
    ontext: ((data:any)=>void) | null = null;

    getConnection(guild: string) {
        let ret = this.connections.get(guild);
        if (!ret) {
            ret = new Connection();
            ret.ontext = this.ontext;
            this.connections.set(guild, ret);
        }
        return ret;
    }
    
    disconnect(guild: string) {
        let connection = this.connections.get(guild);
        if (connection) {
            connection.disconnect();
            this.connections.delete(guild);
        }
    }
}

export { ConnectionList }