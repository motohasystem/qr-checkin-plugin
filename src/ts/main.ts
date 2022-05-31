import "regenerator-runtime/runtime";
import "bootstrap/dist/css/bootstrap.min.css";
import { CheckinManager } from "./checkin-manager";
import { CameraManager } from "./camera-manager";
import { KintoneButtonInstallor } from "./kintone-button-installor";

export interface KintoneEvent {
    // record: kintone.types.SavedFields;
    error: string[];
}

// html側から呼び出す仕掛け
declare global {
    interface Window {
        checkin_manager: CheckinManager;
        camera_manager: CameraManager;
    }
}

/**
 * メイン処理
 */
 (function (PLUGIN_ID) {
    'use strict';
    // const DEBUG_MODE = true;

    const initialize = () =>{
        const config: {} = kintone.plugin.app.getConfig(PLUGIN_ID);
        window.checkin_manager = new CheckinManager()
        window.checkin_manager.setConfig(config)
        window.camera_manager = new CameraManager(window.checkin_manager)
    }

    // 一覧表示イベント
    const EVENT_LIST = [
        'app.record.index.show',
    ];

    let installor: KintoneButtonInstallor;

    // 一覧表示イベント
    kintone.events.on(EVENT_LIST, (event: KintoneEvent) => {

        // 実行ボタン設置
        if (installor === undefined) {
            const config: {} = kintone.plugin.app.getConfig(PLUGIN_ID);           
            installor = new KintoneButtonInstallor(config, PLUGIN_ID);
            installor.install(event);
        }
        initialize()

        return event;
    });

})(kintone.$PLUGIN_ID);

