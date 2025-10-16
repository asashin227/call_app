
/**
 * 音声出力経路の種類
 */
export type AudioRoute = 'Receiver' | 'Speaker' | 'Bluetooth' | 'HeadsetInOut' | 'Unknown';

/**
 * 音声経路変更イベントのデータ
 */
export interface AudioRouteChangeEvent {
  route: AudioRoute;
  reason: number;
  timestamp: number;
}

/**
 * AudioRouteService
 * 
 * アプリUIとCallKitの両方からの音声ルーティング変更を管理し、
 * 状態を同期させるサービス
 */
class AudioRouteService {
  private currentRoute: AudioRoute = 'Receiver';
  private isSpeakerEnabled: boolean = false;
  private listeners: Array<(event: AudioRouteChangeEvent) => void> = [];

  /**
   * 現在の音声出力経路を取得
   */
  getCurrentRoute(): AudioRoute {
    return this.currentRoute;
  }

  /**
   * スピーカーが有効かどうかを取得
   */
  getIsSpeakerEnabled(): boolean {
    return this.isSpeakerEnabled;
  }

  /**
   * CallKitからの音声経路変更を処理
   * @param route 新しい音声経路
   * @param reason 変更理由
   */
  handleCallKitRouteChange(route: AudioRoute, reason: number): void {
    console.log(`🎧 AudioRouteService: CallKit route changed to ${route} (reason: ${reason})`);
    
    const previousRoute = this.currentRoute;
    this.currentRoute = route;
    
    // スピーカー状態を更新
    this.isSpeakerEnabled = route === 'Speaker';
    
    // リスナーに通知
    const event: AudioRouteChangeEvent = {
      route,
      reason,
      timestamp: Date.now(),
    };
    
    this.notifyListeners(event);
    
    console.log(`🎧 AudioRouteService: Route updated ${previousRoute} → ${route}, Speaker: ${this.isSpeakerEnabled}`);
  }

  /**
   * アプリUIからの音声経路変更を処理
   * @param speakerEnabled スピーカーを有効にするかどうか
   */
  handleAppUIRouteChange(speakerEnabled: boolean): void {
    console.log(`🎧 AudioRouteService: App UI route change to Speaker: ${speakerEnabled}`);
    
    const previousRoute = this.currentRoute;
    this.isSpeakerEnabled = speakerEnabled;
    
    // アプリUIからの変更の場合、Bluetooth接続がなければSpeaker/Receiverを設定
    if (this.currentRoute !== 'Bluetooth' && this.currentRoute !== 'HeadsetInOut') {
      this.currentRoute = speakerEnabled ? 'Speaker' : 'Receiver';
      
      // リスナーに通知（理由コード4 = Override）
      const event: AudioRouteChangeEvent = {
        route: this.currentRoute,
        reason: 4,
        timestamp: Date.now(),
      };
      
      this.notifyListeners(event);
      
      console.log(`🎧 AudioRouteService: Route updated by app ${previousRoute} → ${this.currentRoute}`);
    } else {
      console.log(`🎧 AudioRouteService: External device connected, keeping route as ${this.currentRoute}`);
    }
  }

  /**
   * 音声経路変更リスナーを追加
   * @param listener リスナー関数
   * @returns リスナーを削除する関数
   */
  addListener(listener: (event: AudioRouteChangeEvent) => void): () => void {
    this.listeners.push(listener);
    console.log(`🎧 AudioRouteService: Listener added (total: ${this.listeners.length})`);
    
    return () => {
      this.removeListener(listener);
    };
  }

  /**
   * リスナーを削除
   * @param listener 削除するリスナー関数
   */
  private removeListener(listener: (event: AudioRouteChangeEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
      console.log(`🎧 AudioRouteService: Listener removed (total: ${this.listeners.length})`);
    }
  }

  /**
   * すべてのリスナーに通知
   * @param event イベントデータ
   */
  private notifyListeners(event: AudioRouteChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('🎧 AudioRouteService: Error in listener:', error);
      }
    });
  }

  /**
   * サービスをリセット
   */
  reset(): void {
    console.log('🎧 AudioRouteService: Resetting service');
    this.currentRoute = 'Receiver';
    this.isSpeakerEnabled = false;
    this.listeners = [];
  }
}

// シングルトンインスタンスをエクスポート
export const audioRouteService = new AudioRouteService();

