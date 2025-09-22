import { Audio } from 'expo-av';

/**
 * CallKit通話中の音声再生サービス
 * 通話シミュレーション用の音声効果を提供
 */
export class AudioService {
  private static instance: AudioService;
  private sounds: { [key: string]: Audio.Sound } = {};
  private isAudioSessionConfigured = false;

  private constructor() {}

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  /**
   * 音声セッションを設定
   */
  async setupAudioSession(): Promise<void> {
    try {
      console.log('🔊 AudioService: Setting up audio session');
      
      // 音声セッションの設定
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: true,
        playsInSilentModeIOS: true,
      });

      this.isAudioSessionConfigured = true;
      console.log('✅ AudioService: Audio session configured');
    } catch (error) {
      console.error('❌ AudioService: Failed to setup audio session:', error);
      throw error;
    }
  }

  /**
   * 通話音声を生成・再生
   */
  async playCallTone(type: 'dial' | 'ring' | 'busy' | 'connected' | 'disconnect'): Promise<void> {
    try {
      if (!this.isAudioSessionConfigured) {
        await this.setupAudioSession();
      }

      console.log(`🔊 AudioService: Playing ${type} tone`);

      // 音声ファイルパスを取得
      const audioPath = this.getAudioPath(type);
      if (!audioPath) {
        // 音声ファイルがない場合はトーンを生成
        await this.generateTone(type);
        return;
      }

      // 既存の音声を停止
      await this.stopSound(type);

      // 新しい音声を読み込み・再生
      const { sound } = await Audio.Sound.createAsync(audioPath, {
        shouldPlay: true,
        isLooping: type === 'dial' || type === 'ring', // ダイヤル音・着信音はループ
        volume: 0.8,
      });

      this.sounds[type] = sound;

      // 再生完了時のクリーンアップ
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log(`🔊 AudioService: ${type} tone finished`);
          this.stopSound(type);
        }
      });

    } catch (error) {
      console.error(`❌ AudioService: Failed to play ${type} tone:`, error);
    }
  }

  /**
   * 音声生成（ファイルがない場合の代替）
   */
  private async generateTone(type: 'dial' | 'ring' | 'busy' | 'connected' | 'disconnect'): Promise<void> {
    console.log(`🎵 AudioService: Generating ${type} tone (simulation)`);
    
    // 実際の音声生成の代わりにログ出力
    // 実装時は Web Audio API や Audio Units を使用
    switch (type) {
      case 'dial':
        console.log('📞 Simulating dial tone: beep... beep... beep...');
        break;
      case 'ring':
        console.log('📞 Simulating ring tone: ring... ring... ring...');
        break;
      case 'busy':
        console.log('📞 Simulating busy tone: beep-beep-beep');
        break;
      case 'connected':
        console.log('📞 Simulating connected tone: soft beep');
        break;
      case 'disconnect':
        console.log('📞 Simulating disconnect tone: final beep');
        break;
    }

    // シミュレーション用の遅延
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`✅ AudioService: ${type} tone simulation completed`);
        resolve();
      }, 1000);
    });
  }

  /**
   * 特定の音声を停止
   */
  async stopSound(type: string): Promise<void> {
    try {
      if (this.sounds[type]) {
        await this.sounds[type].stopAsync();
        await this.sounds[type].unloadAsync();
        delete this.sounds[type];
        console.log(`🔇 AudioService: Stopped ${type} sound`);
      }
    } catch (error) {
      console.error(`❌ AudioService: Failed to stop ${type} sound:`, error);
    }
  }

  /**
   * 全ての音声を停止
   */
  async stopAllSounds(): Promise<void> {
    console.log('🔇 AudioService: Stopping all sounds');
    const stopPromises = Object.keys(this.sounds).map(type => this.stopSound(type));
    await Promise.all(stopPromises);
  }

  /**
   * 通話状態に応じた音声を再生
   */
  async handleCallStateChange(state: 'outgoing' | 'ringing' | 'connected' | 'ended'): Promise<void> {
    console.log(`🎵 AudioService: Handle call state change to ${state}`);

    switch (state) {
      case 'outgoing':
        await this.playCallTone('dial');
        break;
      case 'ringing':
        await this.stopSound('dial');
        await this.playCallTone('ring');
        break;
      case 'connected':
        await this.stopAllSounds();
        await this.playCallTone('connected');
        break;
      case 'ended':
        await this.stopAllSounds();
        await this.playCallTone('disconnect');
        break;
    }
  }

  /**
   * 音声ファイルのパスを取得
   */
  private getAudioPath(type: string): any | null {
    // 実際の音声ファイルがある場合のパス
    // return require(`../assets/sounds/${type}.mp3`);
    return null; // 現在は音声ファイルなし
  }

  /**
   * リソースをクリーンアップ
   */
  async cleanup(): Promise<void> {
    console.log('🧹 AudioService: Cleaning up resources');
    await this.stopAllSounds();
    this.isAudioSessionConfigured = false;
  }
}

// エクスポート
export const audioService = AudioService.getInstance();
