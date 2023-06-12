import pkg from 'pg'
import {DBResult, ResultStatus} from '../interfaces/db.ts'

export class DB {
    private static db: DB;
    private pool: pkg.Pool;

    private constructor() {
        this.pool = new pkg.Pool({
            user:     process.env.POSTGRES_USER,
            host:     process.env.POSTGRES_HOST,
            database: process.env.POSTGRES_DB,
            password: process.env.POSTGRES_PW,
            port:     parseInt(process.env.POSTGRES_PORT ?? "5432")
        })
    }

    static getInstance() : DB {
        if(this.db == null) {
            this.db = new DB();
        }
        return this.db;
    }

    async executeSp(sp_name: string, params: {[key: string] : any}, resCallback: (result : DBResult) => void) {
        const client = await this.pool.connect();

        let callstring: string = `SELECT * FROM ${sp_name}(`;
        let i = 1;
        let paramsArr: Array<any> = [];

        for(const o in params) {
            if(i > 1) {
                callstring +=  `, `;
            }
            callstring += `${o} := $${i}`
            ++i;
            paramsArr.push(params[o]);
        }
        callstring += ');';
        try{
            client.query(callstring, paramsArr, (err: Error, res: pkg.QueryResult) => {
                if(err) {
                    client.release();
                    resCallback({status: ResultStatus.Error, error: err});
                } else {
                    client.release();
                    resCallback({status: ResultStatus.Success, res: res});
                }
            })
        } catch(error: any) {
            client.release();
            resCallback({status: ResultStatus.Error, error: {message: "unknown_error", name: error}});
        }
    }
}