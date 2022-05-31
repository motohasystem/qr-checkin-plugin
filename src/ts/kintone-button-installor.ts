import MicroModal from "micromodal";
import "regenerator-runtime/runtime";
import { KintoneEvent } from "./main";
import NoSleep from 'nosleep.js'

export class KintoneButtonInstallor {
    /**
     * イベントボタンを配置します
     */

    // private convert : Function;  // 日付の変換ルール

    static MAX_PREVIEW_LINES = 5;
    static DEFAULT_PULLDOWN_CODE = "__NONE__"

    public label_datetime_checkin: string;
    public label_datetime_checkout: string;
    public fc_datetime_checkin: string;
    public fc_datetime_checkout: string;
    public label_lookup_memberid: string;
    public number_guard_millisecond: number;
    public button_id: string;

    public flag_show_button_close: boolean = true;  // trueのときダイアログに閉じるボタンを表示する

    public modal_dialog_id = 'modal_KintoneButtonInstallor'
    private title_modal_dialog: string;
    private checkbox_close_on_dblclick: boolean;
    private checkbox_close_on_multi_tap: boolean;

    private noSleep: NoSleep;
    private is_showing_dialog: boolean = false;

    constructor(config: { [x: string]: string; }, plugin_id: string) {
        this.button_id = 'btn_' + plugin_id;     // プラグイン共存のため、一意なボタンIDを持たせる
        this.modal_dialog_id = 'modal_' + this.button_id

        // configの値、またはデフォルト値を適用

        this.label_datetime_checkin = config["label_datetime_checkin"]
        this.label_datetime_checkout = config["label_datetime_checkout"]
        this.fc_datetime_checkin = config["fc_datetime_checkin"]
        this.fc_datetime_checkout = config["fc_datetime_checkout"]
        this.label_lookup_memberid = config["label_lookup_memberid"]
        this.title_modal_dialog = config["title_dialog"]

        if ('number_limit_records' in config) {
            this.number_guard_millisecond = parseInt(config['number_guard_millisecond'])
        }
        else {
            this.number_guard_millisecond = 1000;
        }

        // 設定からチェックボックスのブール値を取得する
        const getBoolFromConf = (conf:  { [x: string]: string; }, label: string, flag: boolean = false)  => {
            if (label in config){
                return conf[label] == 'true'
            }
            return flag
        }

        this.flag_show_button_close = getBoolFromConf(config, 'checkbox_show_button_close', true)
        this.checkbox_close_on_dblclick = getBoolFromConf(config, "checkbox_close_on_dblclick", false)
        this.checkbox_close_on_multi_tap = getBoolFromConf(config, "checkbox_close_on_multi_tap", false)

        this.noSleep = new NoSleep()
    }

    install(event: KintoneEvent) {
        /**
         * イベントボタンを配置します。
         */
        // const headerSpaceElement = kintone.app.getHeaderSpaceElement();  // レコード一覧のメニューの下側の空白部分の要素を取得する
        const headerSpaceElement = kintone.app.getHeaderMenuSpaceElement();  // レコード一覧のメニューの下側の空白部分の要素を取得する
        if (headerSpaceElement === null) {
            return event;
        }

        // 任意のスペースフィールドにボタンを設置
        const label_button = ((title: string) => {
            if(title == ""){
                return "QRチェックモード"
            }
            return title
        })(this.title_modal_dialog)
        const modeButton = this.createCheckinModeButton(label_button);
        modeButton.className = "kintoneplugin-button-normal"
        headerSpaceElement.appendChild(modeButton);

        const dialog = this.fullscreen_dom()
        document.getElementsByTagName('html')[0].appendChild(dialog);

        MicroModal.init({
            disableScroll: true,
            closeTrigger: 'data-micromodal-close',
            awaitOpenAnimation: true,
            awaitCloseAnimation: true,
            onShow: (modal) => {
                this.is_showing_dialog = true
                this.noSleep.enable()
                if (modal) {
                    console.info(`${modal.id} is shown`)

                    const dialogs = document.getElementsByClassName('modal__container') as HTMLCollectionOf<HTMLDivElement>
                    dialogs[0].style.maxWidth = "100vw"
                    dialogs[0].style.width = "100vw"
                    dialogs[0].style.maxHeight = "100vh"
                    dialogs[0].style.height = "100vh"
                }
                // kintoneヘッダ非表示
                const kintone_header = document.getElementsByClassName('gaia-header') as HTMLCollectionOf<HTMLDivElement>
                kintone_header[0].style.display = 'none'

                console.log("ここに全画面表示処理")
                window.camera_manager.beginScanner()
            }, // [1]
            onClose: (modal) => {
                this.is_showing_dialog = false
                if (modal) {
                    console.info(`${modal.id} is hidden`)
                }
                // kintoneヘッダ表示
                const kintone_header = document.getElementsByClassName('gaia-header') as HTMLCollectionOf<HTMLDivElement>
                kintone_header[0].style.display = 'block'
                
                this.noSleep.disable()
                window.camera_manager._video_stop()
                if (window.checkin_manager.flg_dirty) {
                    location.reload();
                }
            }, // [2]
        });

        // ダイアログが表示されている場合にクローズして後処理
        const close_with_showing_dialog = () =>{
            if(this.is_showing_dialog){
                MicroModal.close(this.modal_dialog_id)
                this.noSleep.disable()
                window.camera_manager._video_stop()
            }

        }


        // イベント追加: ダブルクリックでダイアログを閉じる
        if(this.checkbox_close_on_dblclick){
            document.addEventListener('dblclick', ()=>{
                close_with_showing_dialog()
            })
        }

        // イベント追加: 3本指のマルチタッチでダイアログを閉じる
        if(this.checkbox_close_on_multi_tap){
            document.addEventListener(
                'touchstart',
                (event: any) => {
                    if (event.touches.length == 3) {
                        close_with_showing_dialog()
                        event.preventDefault();
                    }
                }, {
                    passive: false
                }
            );
        }

    }

    // 全画面モードボタン
    createCheckinModeButton(label: string) {
        const btn = document.createElement('button');
        btn.setAttribute('class', 'kintoneplugin-button-disabled') // ボタンスタイル
        btn.setAttribute('class', 'kintoneplugin-button-disabled') // ボタンスタイル
        btn.setAttribute('data-micromodal-trigger', this.modal_dialog_id)
        btn.removeAttribute('disabled') // デフォルトで活性

        btn.id = 'btn_fullscreen';
        btn.innerText = label;
        // btn.onclick = () => {
        //     console.log("ここに全画面表示処理")

        // }

        return btn
    }


    /**
     * チェックインモードの画面を構築する
     * @returns DOM
     */
    // fullscreen_dom(title: string, code_src: string, label_src: string, code_dst: string, label_dst: string, value_src: string, value_dst: string){
    fullscreen_dom() {

        const id_modal_dialog = this.modal_dialog_id

        const make_btn_checkin = (id: string, label: string, value:string = "checkin", btn_style: string = "", checked: string = "") => {
            // btn_style = btn-outline-success orbtn-outline-info
            return `
                <span>
                    <input type="radio" style="list-style: none;" id="${id}" name="radio_checkin_checkout" value="${value}" ${checked}/>
                    <label for="${id}" class="btn ${btn_style} btn-lg">${label}</label>
                </span>
            `;
        }
        const btn_checkin = make_btn_checkin("mode_checkin", this.label_datetime_checkin, "checkin", "btn-outline-success", "checked")
        const btn_checkout = ((code) => {
            if(code == KintoneButtonInstallor.DEFAULT_PULLDOWN_CODE){
                return ""
            }
            return make_btn_checkin("mode_checkout", this.label_datetime_checkout, "checkout", "btn-outline-info", "")
        })(this.fc_datetime_checkout)

        const btn_close = ((flg) =>{
            if(flg){
                return '<input type="button" class="btn btn-outline-secondary btn-lg" data-micromodal-close value="Close">'
            }
            return ""

        })(this.flag_show_button_close)

        let dialogMM = `
    <div class="modal micromodal-slide" id="${id_modal_dialog}" aria-hidden="true">
        <div class="modal__overlay" tabindex="-1">
            <div class="modal__container" role="dialog" aria-modal="true" aria-labelledby="${id_modal_dialog}-title">
                <header class="modal__header">
                    <h2 class="modal__title" id="${id_modal_dialog}-title">
                    ${this.title_modal_dialog}
                    </h2>
                </header>

                <div class="grid-container">
                    <div class="grid-item-radiobuttons">
                        <form id='form_interactive_settings'>
                            ${btn_checkin}
                            ${btn_checkout}
                            ${btn_close}
                        </form>
                    </div>

                    <div id="dialog_leftside" class="grid-item-video">
                        <div id="loadingMessage">🎥 Unable to access video stream (please make sure you have a webcam enabled)</div>
                        <canvas id="canvas" hidden></canvas>
                        <div id="output" hidden></div>
                    </div>

                    <div class="grid-item-status-message">
                        <div id="outputMessage" >No QR code detected.</div>
                        <div id="reading" hidden><b>Data:</b> <span id="outputData"></span></div>
                    </div>

                    <div id="dialog_rightside" class="grid-item-checkin-messages">
                        <ul id="checkinMessages" class="checkin-list"><li>QRコードをかざしてください</li></ul>
                    </div>
                </div>


                <div class="jsQR_cam"></div>
            </div>
        </div>
    </div>`

        const myDiv = document.createElement("div");
        myDiv.id = 'modal-dialog-apply'
        myDiv.innerHTML = dialogMM;

        return myDiv
    }
}
