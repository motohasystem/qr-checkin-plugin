import { KintoneButtonInstallor } from "./kintone-button-installor";

export class CheckinManager {
    static RETRY_BUFFER_TIME: number = 3000

    private last_check: string = '';
    private guard_millisecond: number = 0;
    private last_checkin_time: number = -1;

    private fc_memberid: string = '';           // 会員IDを記録するフィールドコード
    private fc_datetime_checkin: string = '';   // チェックイン日時の記録
    private fc_datetime_checkout: string = '';  // チェックアウト日時の記録
    private radio_checkinstyle: string = '';    // "transaction" | "swarm"

    public flg_dirty: boolean = false; // ダーティフラグ

    private label_datetime_checkin: string = 'チェックイン';
    private label_datetime_checkout: string = 'チェックアウト';

    // チェックインメッセージをダイアログ中に表示する
    static set_checkin_message(msg: string, icon: string = "🥷"): void {
        const checkinMessages = document.getElementById("checkinMessages");
        if (checkinMessages) {
            const node_li = document.createElement('li')
            node_li.textContent = [icon, msg].join(" ");
            checkinMessages.prepend(node_li)
            // checkinMessages.appendChild(node_li)
        }

        return
    }

    setConfig(config: { [key: string]: string }) {
        console.log(config)
        // this.config = config
        this.guard_millisecond = parseInt(config['number_guard_millisecond'])
        this.fc_memberid = config['fc_lookup_memberid']
        // config['label_lookup_memberid']       // "会員番号"

        this.fc_datetime_checkin = config['fc_datetime_checkin']     // "datetime_checkin"
        this.fc_datetime_checkout = config['fc_datetime_checkout']        // "datetime_checkout"
        this.radio_checkinstyle = config['radio_checkinstyle']      // "transaction" or "swarm"
        this.fc_memberid = config['fc_lookup_memberid']      // "lkup_member_id"

        this.label_datetime_checkin = config['label_datetime_checkin']      // "チェックイン"
        this.label_datetime_checkout = config['label_datetime_checkout']     // "チェックアウト"
        // config['number_guard_millisecond']     // "100"

        return config
    }

    check(data: string): boolean {
        if (!data) {
            return false
        }

        // リトライバッファ時間以内のチェックインは全てパスする(swarm modeでも同様)
        let checkin_time = new Date().getTime()
        if ( this.isDoubleCheckin(checkin_time, CheckinManager.RETRY_BUFFER_TIME) ){
            return false;
        }

        // 同じ番号かつガード時間内の連続チェックインを回避する（ガード時間を過ぎていれば連続チェックイン可能）
        if (this.last_check == data && this.isDoubleCheckin(checkin_time, this.guard_millisecond)) {
            return false
        }

        this.create(data)
        this.last_checkin_time = checkin_time
        this.last_check = data

        return true
    }

    /**
     * 前回のチェックインと比較して、guardtime以内であればtrueを返す
     * @param checkin_time 今回のチェックイン（ミリ秒）
     * @param guard_time ガードタイム（ミリ秒）
     * @returns 
     */
    isDoubleCheckin(checkin_time: number, guard_time: number = this.guard_millisecond): boolean{
        // console.log({checkin_time})
        console.log(`last_checkin: ${this.last_checkin_time}`)
        // console.log({guard_time})

        if (checkin_time < this.last_checkin_time + guard_time) {   // 前回のチェックインからガード時間以内のチェックインだった
            return true
        }

        return false
    }

    getCheckinMode() {
        const forms = document.getElementById('form_interactive_settings') as HTMLFormElement
        const mode = forms.radio_checkin_checkout.value
        return mode
    }

    getCheckinLabel(invert: Boolean = false) {
        const mode = this.getCheckinMode()

        if (invert) {  // 反転フラグ
            switch (mode) {
                case 'checkin':
                    return this.label_datetime_checkout
                    break;
                case 'checkout':
                    return this.label_datetime_checkin
                    break;
            }
        }
        else {
            switch (mode) {
                case 'checkin':
                    return this.label_datetime_checkin
                    break;
                case 'checkout':
                    return this.label_datetime_checkout
                    break;
            }

        }
        return `ラジオボタンの値が異常です。[${mode}]`
    }

    /**
     * チェックインレコードを作成する
     * @param member_id 
     */
    create(member_id: string) {
        const checkintime = new Date()
        let checkin: string = '';
        let checkout: string = '';

        const mode_inout = this.getCheckinMode()
        switch (mode_inout) {
            case 'checkin':
                checkin = checkintime.toISOString()
                checkout = ''
                break;
            case 'checkout':
                checkin = ''
                checkout = checkintime.toISOString()
                break;
        }
        console.log(mode_inout)

        // 新規登録するkintoneレコード
        const body_record = {
            [this.fc_memberid]: {
                'value': member_id
            }
            , [this.fc_datetime_checkin]: {
                'value': checkin
            }
        }
        if(this.fc_datetime_checkout != KintoneButtonInstallor.DEFAULT_PULLDOWN_CODE){
            body_record[this.fc_datetime_checkout] = {
                'value': checkout
            }
        }

        const body = {
            'app': kintone.app.getId(),
            'record': body_record
        }

        switch (this.radio_checkinstyle) {
            case 'swarm':   // swarm style ではトランザクションチェックをせずに登録する
                console.log("swarm mode");
                // 登録処理
                this.register(body)
                break;
            case 'transaction':
                console.log("transaction mode");
                // トランザクションチェックと、成功すれば登録処理
                this.transaction(mode_inout, member_id, body)
                break;
        }
    }

    // トランザクションチェックと、成功すれば登録処理
    transaction(mode: string, member_id: string, create_body: {}) {
        const query = this._buildQueryByToday(member_id, this.fc_memberid, this.fc_datetime_checkin, this.fc_datetime_checkout);

        const query_fields = ((code_checkin: string, code_checkout:string) => {
            const fields = ['$id', code_checkin];
            if(code_checkout != KintoneButtonInstallor.DEFAULT_PULLDOWN_CODE){
                fields.push(code_checkout)
            }
            return fields;
        })(this.fc_datetime_checkin, this.fc_datetime_checkout);

        const query_body = {
            'app': kintone.app.getId(),
            'fields': query_fields,
            'query': query,
        };

        const invert_style = this.getCheckinLabel(true) // チェックアウトフィールドのラベルを取得
        // 指定したメンバーIDについて、本日の最新1件のチェックインを取得して、トランザクション正常性をチェック
        kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', query_body)
        .then((result) => {
            // console.log(result)
            // 正常性をチェック
            if (this.isCapableTransaction(mode, result)) {
                // 正常ならここでkintoneへPOST(Create)
                console.log(`[Success] 正常なチェックインです: ${mode} / ${this.radio_checkinstyle} / ${member_id}`)
                this.register(create_body)
            }
            else {
                console.log(`[ERROR] 異常なチェックインです: ${this.radio_checkinstyle} / ${member_id}`)
                let msg;
                if(this.fc_datetime_checkout == KintoneButtonInstallor.DEFAULT_PULLDOWN_CODE){
                    msg = `登録できません。プラグインの設定に齟齬が生じました。[mode: handshake / checkout: ${invert_style}]`
                }
                else{
                    msg = `登録できません。[${member_id}] は${invert_style}していません。`
                }
                CheckinManager.set_checkin_message(msg)

            }
        })
    }

    register(create_body: any) {
        const member_id = create_body.record[this.fc_memberid].value
        const style = this.getCheckinLabel()

        kintone.api(kintone.api.url('/k/v1/record.json', true), 'POST', create_body)
            .then((result) => {
                this.flg_dirty = true;
                console.log(`[success] レコードの登録に成功しました: ${result}`)
                const msg = `[${member_id}]の${style}を登録しました。`
                CheckinManager.set_checkin_message(msg, "✅")
            })
            .catch((error) => {
                console.log(`[fail] レコードの登録に失敗しました: ${error.message}`)
                const msg = `未登録のID[${member_id}]を読み取りました。${style}を登録できません。`
                CheckinManager.set_checkin_message(msg, "🚫")
            })
    }

    // mode_inoutが'checkin'のとき → 本日中の最新1件の記録がチェックアウトまたはゼロ件であること
    // mode_inoutが'checkout'のとき → 最新の1件がチェックインであること
    isCapableTransaction(mode: string, api_result: any): Boolean {
        console.log({api_result})
        switch (mode) {
            case 'checkin':     // チェックイン
                if (api_result.records.length == 0) {
                    return true
                }
                if (this.isCheckinRecord(api_result)) {
                    return false // 最新1件がチェックインであれば連続チェックインになるためFalse
                }
                // in/outともに空欄のレコードや、in/outともに値が入っているとき、人手入力とみなしてチェックインを有効にします
                return true
            case 'checkout':    // チェックアウト
                if (this.isCheckinRecord(api_result)) {
                    return true // 最新1件がチェックインであればTrue
                }
                break;
        }
        return false
    }

    /**
     * チェックインレコードであることが明白な場合にtrueを返す。
     * @param api_result kintone rest apiのリターンオブジェクト
     * @returns 
     */
    isCheckinRecord(api_result: any): Boolean {
        if(api_result.records.length == 0){
            return false    // 未登録の会員IDの場合
        }
        const first = api_result.records[0]
        const cin = first[this.fc_datetime_checkin]
        const cout = first[this.fc_datetime_checkout]

        if (cin.value != "" && cout === undefined || cin.value != "" && cout.value == "") {    // チェックイン
            return true
        }

        // それ以外はチェックインレコードではないのでfalseを返す
        // 例えば、in/outの両方とも日時が格納されている、両方とも空欄、などは人手による登録と考えられる
        return false
    }

    /**
     * 指定したメンバーIDについて、チェックインまたはチェックアウト日時が本日中の最新1件の記録を取得する
     * @param member_id 
     * @param fc_memberid 
     * @param fc_checkin 
     * @param fc_checkout 
     * @returns 
     */
    _buildQueryByToday(member_id: string, fc_memberid: string, fc_checkin: string, fc_checkout: string): string {
        // datetime_checkin = TODAY() or datetime_checkout = TODAY()
        // order byは省略することでレコードIDの降順ソートで取得することを意図
        let query;
        if(fc_checkout == KintoneButtonInstallor.DEFAULT_PULLDOWN_CODE){
            query = `${fc_memberid}=${member_id} and ${fc_checkin} = TODAY() limit 1`
        }
        else{
            query = `${fc_memberid}=${member_id} and (${fc_checkin} = TODAY() or ${fc_checkout} = TODAY()) limit 1`
        }
        return query
    }

}