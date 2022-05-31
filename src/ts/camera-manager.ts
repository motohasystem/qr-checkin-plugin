import "regenerator-runtime/runtime";

import jsQR from "jsqr";
import { Point } from "jsqr/dist/locator";
import { CheckinManager } from "./checkin-manager";

export class CameraManager {
    public video: HTMLVideoElement | null = null;
    private mediaStream: MediaStream | null = null;

    private cameraFacing: boolean = true
    private canvasElement: HTMLCanvasElement | null = null
    private canvas: CanvasRenderingContext2D | null = null
    private loadingMessage: HTMLElement | null = null
    private outputContainer: HTMLElement | null = null
    private outputMessage: HTMLElement | null = null
    private outputData: HTMLElement | null = null
    private parentElement: HTMLElement | null | undefined = null

    private _checkin_manager: CheckinManager

    private frameColor: string = "#555555" 
    private succeededColor: string = "#99FF55"

    private requestId = -1;     // requestAnimationFrame()の返り値、cancelAnimationFrame(requestId) で使用する
    // private loopCounter = 0;

    constructor(checkin_manager: CheckinManager){
        this._checkin_manager = checkin_manager
    }

    drawLine(begin: Point, end: Point, color: string) {
        if (this.canvas) {
            this.canvas.beginPath();
            this.canvas.moveTo(begin.x, begin.y);
            this.canvas.lineTo(end.x, end.y);
            this.canvas.lineWidth = 4;
            this.canvas.strokeStyle = color;
            this.canvas.stroke();
        }
    }

    drawFrame(x0: number, y0: number, x1: number, y1:number, color: string){
        if (this.canvas) {
            this.canvas.beginPath();
            this.canvas.lineWidth = 32;

            this.canvas.strokeStyle = color;
            this.canvas.moveTo(x0, y0);
            this.canvas.lineTo(x1, y0);
            this.canvas.lineTo(x1, y1);
            this.canvas.lineTo(x0, y1);
            this.canvas.lineTo(x0, y0);
            this.canvas.stroke();
        }
    }

    beginScanner() {
        console.log("チェックイン処理")

        this.video = document.createElement("video");
        this.video.className = "codereader-video"
    
        this.canvasElement = document.getElementById("canvas") as HTMLCanvasElement;
        this.canvasElement.style.transform = "scaleX(-1)";
        this.canvas = this.canvasElement?.getContext("2d");
        this.loadingMessage = document.getElementById("loadingMessage");
        this.outputContainer = document.getElementById("output");
        this.outputMessage = document.getElementById("outputMessage");
        this.outputData = document.getElementById("outputData");
        this.parentElement = this.outputData?.parentElement

        const self = this
        navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: this.cameraFacing ? "user": "environment"
                , frameRate: {
                    ideal: 10
                    // max: 5
                }
                , width: { ideal: 640 }
                , height: { ideal: 480 }
            }
        }).then(function (stream) {
            self.mediaStream = stream
            if(self.video != null){
                console.table(self.video)

                self.video.srcObject = self.mediaStream;
                self.video.setAttribute("playsinline", 'True'); // required to tell iOS safari we don't want fullscreen
                self.video.play();
            }
            self.requestId = requestAnimationFrame(tick);
        }).catch((error)=>{
            console.log(`[ERROR} Starting videoinput failed:  ${error}`)
            CheckinManager.set_checkin_message('ビデオの初期化に失敗しました。')
        });

        // カメラ読み取り開始
        async function tick() {
            // console.log(`tick(): ${self.loopCounter++}`)
            if (
                self.parentElement == null 
                || self.loadingMessage == null 
                || self.outputContainer == null 
                || self.outputMessage == null 
                || self.canvasElement == null 
                || self.outputData == null
                || self.video == null) {
                return;
            }

            self.loadingMessage.innerText = "⌛ Loading video..."
            if (self.video.readyState === self.video.HAVE_ENOUGH_DATA) {
                self.loadingMessage.hidden = true;
                self.canvasElement.hidden = false;
                self.outputContainer.hidden = false;

                const shortEdge = self.video.videoHeight > self.video.videoWidth ? self.video.videoWidth : self.video.videoHeight
                self.canvasElement.height = shortEdge // self.video.videoHeight;
                self.canvasElement.width = shortEdge // self.video.videoWidth;
                // canvas?.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
                self.canvas?.drawImage(self.video, 
                        0, 0, self.canvasElement.width, self.canvasElement.height,
                        0, 0, self.canvasElement.width, self.canvasElement.height
                    );

                const imageData = self.canvas?.getImageData(0, 0, self.canvasElement.width, self.canvasElement.height);
                if (imageData == undefined) {
                    return
                }
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });

                // フィードバック用の枠線表示
                self.drawFrame(0, 0, imageData.width, imageData.height, self.frameColor )

                if (code) {
                    if(code.data == ""){
                        self.requestId = requestAnimationFrame(tick)
                        return;
                    }
                    self.drawLine(code.location.topLeftCorner, code.location.topRightCorner, "#FF3B58");
                    self.drawLine(code.location.topRightCorner, code.location.bottomRightCorner, "#FF3B58");
                    self.drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, "#FF3B58");
                    self.drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, "#FF3B58");

                    self.outputMessage.hidden = true;
                    self.parentElement.hidden = false;
                    self.outputData.innerText = code.data;

                    if( self._checkin_manager.check(code.data) ){  // QRコードを読み取ったときにチェックイン処理
                        // 読み取り成功時に1秒間だけカメラ映像を停止する
                        self.drawFrame(0, 0, imageData.width, imageData.height, self.succeededColor )
                        await ((ms)=>{
                            return new Promise((resolve) => {
                                setTimeout(()=>{
                                    self.requestId = requestAnimationFrame(tick)
                                    resolve
                                }, ms)
                                // self.setFrameColor(self.frameColor)
                            });
                        })(1*1000)
                    }
                } else {
                    self.outputMessage.hidden = false;
                    self.parentElement.hidden = true;
                }
            }
            self.requestId = requestAnimationFrame(tick)
        }

    }

    setFrameColor(color: string = "#FF0000"){
        this.frameColor = color
    }

    _video_stop() {
        cancelAnimationFrame(this.requestId)
        navigator.mediaDevices.getUserMedia(
            { 
                video: { 
                    facingMode: this.cameraFacing ? "user": "environment"
                }
            }
        ).then(mediaStream => {
            // this.video.srcObject = mediaStream;
            // Stop the stream after 2 seconds
            setTimeout(() => {
                if(mediaStream == null){
                    return
                }
                const tracks = mediaStream.getTracks()
                tracks.forEach(track=>{
                    track.stop()
                    mediaStream.removeTrack(track)
                })

                this.mediaStream = null

                if(this.video){
                    this.video.pause()
                    this.video.srcObject = null
                    this.video.removeAttribute('srcObject')
                    // this.video.load()
                    console.log('video released')
                }
            }, 2000)
        })
    }
}
