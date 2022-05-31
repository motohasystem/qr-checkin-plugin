jQuery.noConflict();

(function ($, PLUGIN_ID) {
    'use strict';

    const DEFAULT_PULLDOWN_CODE  = "__NONE__";
    const DEFAULT_PULLDOWN_LABEL = "指定しない";

    const DEFAULT_DIALOG_TITLE = "QRチェックイン"

    const form_node = document.getElementById('form_settings');
    const formparts = {};
    const formparts_datetime = {};
    const formparts_lookup = {};

    // 保存している変換ルールの設定をチェックボックスに反映
    const CONF = kintone.plugin.app.getConfig(PLUGIN_ID);

    // 設定値またはデフォルト値を取得
    const get_from = (dic, conf_key, defaults) => {
        if (dic.hasOwnProperty(conf_key)) {
            return dic[conf_key]
        }
        return defaults
    }

    const label_datetime_checkin = get_from(CONF, 'label_datetime_checkin', '');
    const label_datetime_checkout = get_from(CONF, 'label_datetime_checkout', '')
    const label_lookup_memberid = get_from(CONF, 'label_lookup_memberid', '')
    const checkbox_show_button_close = get_from(CONF, 'checkbox_show_button_close', 'true') // 閉じるボタンの表示設定
    const checkbox_close_on_dblclick = get_from(CONF, 'checkbox_close_on_dblclick', 'true')   // ダブルクリックでダイアログを閉じる
    const checkbox_close_on_multi_tap = get_from(CONF, 'checkbox_close_on_multi_tap', 'true')   // フォーカス喪失でダイアログを閉じる

    const title_dialog = get_from(CONF, 'title_dialog', DEFAULT_DIALOG_TITLE)

    // 適用ボタンの可否チェック
    const check_apply_button_enabling = () =>{
        const form_node = document.getElementById('form_settings');
        const label_checkout = form_node.label_datetime_checkout.value
        const radio = form_node.radio_checkinstyle.value

        const btn_apply = document.getElementById('btn_apply')
        let msg = "";
        if(label_checkout == DEFAULT_PULLDOWN_LABEL && radio == 'transaction'){
            // チェックアウトフィールドを指定しない and チェックインモードがトランザクションの場合、適用ボタンをグレーアウトする
            btn_apply.disabled = true
            btn_apply.className = 'kintoneplugin-button-disabled'
            msg = "🚫 Handshake modeではチェックアウトフィールドの指定が必須です。"
        }
        else{
            btn_apply.disabled = false
            btn_apply.className = 'kintoneplugin-button-dialog-ok'
        }
        const msg_submit = document.getElementById('msg_submitarea')
        msg_submit.textContent = msg;

    }

    // プルダウンデフォルト値
    formparts_datetime[DEFAULT_PULLDOWN_LABEL] = DEFAULT_PULLDOWN_CODE  // DATE形式のフォーム部品の辞書を構築
    const pulldown_checkout = document.getElementById('label_datetime_checkout')
    const node_option = document.createElement('option')
    node_option.textContent = DEFAULT_PULLDOWN_LABEL
    node_option.setAttribute('name', DEFAULT_PULLDOWN_CODE)
    pulldown_checkout.appendChild(node_option)
    pulldown_checkout.addEventListener('change', check_apply_button_enabling, false)
  


    // トランザクションモードラジオボタン
    form_node.radio_checkinstyle.value = get_from(CONF, 'radio_checkinstyle', 'transaction');  // transaction, swarm
    const node_radio_checkinstyle = document.getElementById('div_radio_checkinstyle')
    node_radio_checkinstyle.addEventListener('change', check_apply_button_enabling, false)

    
    // タイトル
    form_node.title_dialog.value = get_from(CONF, 'title_dialog', DEFAULT_DIALOG_TITLE)
    // ガードタイム
    form_node.number_guard_millisecond.value = get_from(CONF, 'number_guard_millisecond', "1000")
    // チェックボックス0: 閉じるボタンの表示
    form_node.checkbox[0].checked = checkbox_show_button_close == "true"    // 閉じるボタンで閉じる
    form_node.checkbox[1].checked = checkbox_close_on_dblclick == "true" // ダブルクリックで閉じる
    form_node.checkbox[2].checked = checkbox_close_on_multi_tap == "true"   // マルチタップで閉じる


    kintone.api(kintone.api.url('/k/v1/app/form/fields', true), 'GET', {  // フォーム情報を取得
        app: kintone.app.getId()
    }, function (resp) {
        /* resp.properties */
        /** resp.properties には下記のデータが入る
            "[フィールドコード]": {
                "type": "SINGLE_LINE_TEXT",  https://developer.cybozu.io/hc/ja/articles/202166330-フィールド形式
                "code": "[フィールドコード]",
                "label": "テーマその他",
                "noLabel": false,
                "required": false,
                "minLength": "",
                "maxLength": "",
                "expression": "",
                "hideExpression": false,
                "unique": false,
                "defaultValue": ""
            },
         * 
         */

        for (const key in resp.properties) {
            if (!resp.properties.hasOwnProperty(key)) { continue; }
            const confFlg = false;
            const prop = resp.properties[key];
            const label = prop.label;
            const code = prop.code;
            const type = prop.type;
            formparts[code] = {
                'code': code,
                'label': label,
                'type': type
            }

            if (prop.type === 'DATETIME') {
                formparts_datetime[prop.label] = prop.code  // DATE形式のフォーム部品の辞書を構築
                const is_checked_in = ((label) => {
                    if (label == label_datetime_checkin) {
                        return ' selected'
                    }
                    return ''
                })(label)

                const is_checked_out = ((label) => {
                    if (label == label_datetime_checkout) {
                        return ' selected'
                    }
                    return ''
                })(label)

                // チェックイン側のプルダウン(label_datetime_checkin == label のときにcheckedをつける)
                $('#label_datetime_checkin').append('<option name=' + code + `${is_checked_in}>` + label + '</option>');
                // チェックアウト側のプルダウン(label_datetime_checkout == label のときにcheckedをつける)
                $('#label_datetime_checkout').append('<option name=' + code + `${is_checked_out}>` + label + '</option>');
            }
            // LOOKUP形式のフォーム部品の辞書を構築
            else if (prop.hasOwnProperty('lookup')) {
                formparts_lookup[prop.label] = prop.code
                $('#label_lookup_memberid').append('<option name=' + code + '>' + label + '</option>');

            }
        }
        check_apply_button_enabling()
    });

    const $form = $('.js-submit-settings');
    const $cancelButton = $('.js-cancel-button');

    // submitイベント
    $form.on('submit', function (e) {
        const updated = {};

        // 設定値の取得
        const form_node = document.getElementById('form_settings');

        updated['label_datetime_checkin'] = form_node.label_datetime_checkin.value
        updated['fc_datetime_checkin'] = formparts_datetime[form_node.label_datetime_checkin.value]
        updated['label_datetime_checkout'] = form_node.label_datetime_checkout.value
        updated['fc_datetime_checkout'] = formparts_datetime[form_node.label_datetime_checkout.value]

        updated['label_lookup_memberid'] = form_node.label_lookup_memberid.value
        updated['fc_lookup_memberid'] = formparts_lookup[form_node.label_lookup_memberid.value]
        updated['radio_checkinstyle'] = form_node.radio_checkinstyle.value
        updated['number_guard_millisecond'] = form_node.number_guard_millisecond.value  // ガードレール
        updated['title_dialog'] = form_node.title_dialog.value  // ダイアログタイトル
        
        updated['checkbox_show_button_close'] = form_node.checkbox[0].checked == true ? 'true' : 'false'   // 閉じるボタンの表示チェックボックス
        updated['checkbox_close_on_dblclick'] = form_node.checkbox[1].checked == true ? 'true' : 'false'    // ダブルクリックで閉じる
        updated['checkbox_close_on_multi_tap'] = form_node.checkbox[2].checked == true ? 'true' : 'false'    // 3本指のマルチタップで閉じる
        
        if(
            updated['fc_datetime_checkout'] == DEFAULT_PULLDOWN_CODE 
            && updated['radio_checkinstyle'] =="transaction"
        ){
            alert("保存できません。双方向チェックスタイルではチェックアウトフィールドを指定してください。")
        }
        else{
            e.preventDefault();
            kintone.plugin.app.setConfig(updated, function () {
                alert('プラグイン設定を保存しました。アプリの更新をお忘れなく！');
                window.location.href = '../../flow?app=' + kintone.app.getId();
            });
        }
    });

    $cancelButton.on('click', function () {
        window.location.href = '../../' + kintone.app.getId() + '/plugin/';
    });

})(jQuery, kintone.$PLUGIN_ID);
