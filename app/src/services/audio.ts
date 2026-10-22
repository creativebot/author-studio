import { Platform } from 'react-native';
import { Audio } from 'expo-av';

let webMediaRecorder: MediaRecorder | null = null;
let webAudioChunks: Blob[] = [];
let recordingStartTime = 0;
let nativeRecording: Audio.Recording | null = null;

export const AudioService = {
  async startRecording(): Promise<void> {
    recordingStartTime = Date.now();

    if (Platform.OS === 'web') {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone audio recording is not supported in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      webAudioChunks = [];
      webMediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      webMediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          webAudioChunks.push(event.data);
        }
      };
      webMediaRecorder.start(250); // gather chunks every 250ms
    } else {
      // Native Android / iOS via expo-av
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission is required to record dictation.');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true // Walking dictation support!
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      nativeRecording = recording;
    }
  },

  async stopRecording(): Promise<{ blob: Blob; durationSeconds: number }> {
    const durationSeconds = (Date.now() - recordingStartTime) / 1000;

    if (Platform.OS === 'web') {
      if (!webMediaRecorder) {
        throw new Error('No active web recording.');
      }

      return new Promise((resolve) => {
        webMediaRecorder!.onstop = () => {
          const blob = new Blob(webAudioChunks, { type: 'audio/webm' });
          // Stop all audio tracks
          webMediaRecorder!.stream.getTracks().forEach((track) => track.stop());
          webMediaRecorder = null;
          webAudioChunks = [];
          resolve({ blob, durationSeconds });
        };
        webMediaRecorder!.stop();
      });
    } else {
      // Native Android / iOS
      if (!nativeRecording) {
        throw new Error('No active native recording.');
      }
      await nativeRecording.stopAndUnloadAsync();
      const uri = nativeRecording.getURI();
      nativeRecording = null;

      if (!uri) throw new Error('No audio file URI recorded.');

      const response = await fetch(uri);
      const blob = await response.blob();
      return { blob, durationSeconds };
    }
  }
};
