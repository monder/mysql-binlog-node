/// <reference types="node" />
import { EventEmitter } from 'events';
export interface BinlogPosition {
    name: string;
    position: number;
}
export interface Config {
    hostname: string;
    port: number;
    username: string;
    password: string;
    tableRegexes: string[];
    binlogPosition?: BinlogPosition;
}
export interface BinlogEvent {
    binlogPosition: {
        name: string;
        position: number;
    };
    table: {
        schema: string;
        name: string;
    };
    insert?: Record<string, any>;
    update?: {
        old: Record<string, any>;
        new: Record<string, any>;
    };
    delete?: Record<string, any>;
}
declare class MysqlBinlog extends EventEmitter {
    private _process;
    private _readline;
    private constructor();
    private send;
    static create(config: Config): Promise<MysqlBinlog>;
    close(): Promise<void>;
    on(name: 'event', listener: (event: BinlogEvent) => void): this;
    on(name: 'error', listener: (err: Error) => void): this;
    on(name: 'close', listener: () => void): this;
    on(name: 'beforeClose', listener: () => void): this;
}
export default MysqlBinlog;
