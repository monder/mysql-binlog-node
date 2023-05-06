"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const debug_1 = require("debug");
const child_process_1 = require("child_process");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const os = require("os");
const debugChannel = (0, debug_1.debug)('mysql_binlog');
function _discoverGoBinary() {
    let suffix = '';
    if (os.platform() === 'win32') {
        suffix = '.exe';
    }
    const filename = path.join(__dirname, '..', 'prebuilds', `${os.platform()}-${os.arch()}${suffix}`);
    if (!fs.existsSync(filename)) {
        throw new Error('Could not find pre-compiled Go binary. Either your platform is unsupported or you need to compile the binaries');
    }
    return filename;
}
class MysqlBinlog extends events_1.EventEmitter {
    constructor(config, process) {
        super();
        this._process = process;
        this._readline = readline.createInterface({
            input: this._process.stdout,
            crlfDelay: Infinity,
        });
        this._readline.on('line', (line) => {
            let msg;
            try {
                msg = JSON.parse(line);
                if (typeof msg !== 'object') {
                    throw new Error();
                }
            }
            catch (err) {
                debugChannel('received unexpected message on stdout: %s', line);
                this.emit('error', new Error('received unexpected message'));
                return;
            }
            switch (msg.type) {
                case 'connect_ok':
                    this.emit('_connect_ok');
                    break;
                case 'connect_error':
                    this.emit('_connect_err', new Error(msg.error));
                    break;
                case 'binlog_change':
                    this.emit('event', msg.event);
                    break;
                case 'log':
                    debugChannel(msg.message.trimEnd());
                    break;
                default:
                    debugChannel('received unexpected message on stdout: %o', msg);
                    this.emit('error', new Error('received unexpected message'));
                    break;
            }
        });
        this._process.stderr.on('data', (chunk) => {
            debugChannel('received unexpected data on stderr: %s', chunk);
            this.emit('error', new Error('received unexpected data on stderr'));
        });
        this._process.on('close', () => {
            this.emit('close');
        });
        this._process.on('error', (err) => {
            debugChannel('received unexpected error: %s', err);
            this.emit('error', err);
        });
        this.send({
            type: 'connect',
            config,
        });
    }
    send(message) {
        this._process.stdin.write(JSON.stringify(message) + '\n');
    }
    static create(config) {
        return new Promise((resolve, reject) => {
            const process = (0, child_process_1.spawn)(_discoverGoBinary(), {
                stdio: 'pipe',
            });
            process.on('error', (err) => {
                reject(err);
            });
            process.once('spawn', () => {
                process.removeAllListeners('error');
                const obj = new MysqlBinlog(config, process);
                obj.once('_connect_ok', () => {
                    resolve(obj);
                });
                obj.once('_connect_err', (err) => {
                    obj.close();
                    reject(err);
                });
            });
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._process.exitCode !== null) {
                // do not try to kill the process multiple times
                return;
            }
            this.emit('beforeClose');
            this._readline.close();
            this._process.kill();
            return new Promise((resolve, reject) => {
                this._process.once('error', (err) => {
                    reject(err);
                });
                this._process.once('close', () => {
                    resolve(undefined);
                });
            });
        });
    }
    on(eventName, listener) {
        return super.on(eventName, listener);
    }
}
exports.default = MysqlBinlog;
