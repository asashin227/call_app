import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ManualSignalingIndex() {
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>🔧 手動シグナリング</Text>
        <Text style={styles.subtitle}>
          シグナリングサーバーなしで通話をテストできます
        </Text>
      </View>
      
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.modeButton}
          onPress={() => router.push('/manual-signaling/caller-step1')}
        >
          <Ionicons name="call-outline" size={40} color="#007AFF" />
          <Text style={styles.modeButtonTitle}>発信側（Caller）</Text>
          <Text style={styles.modeButtonDesc}>
            Offerを生成して相手に送信
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.modeButton}
          onPress={() => router.push('/manual-signaling/receiver-step1')}
        >
          <Ionicons name="call-sharp" size={40} color="#34C759" />
          <Text style={styles.modeButtonTitle}>受信側（Receiver）</Text>
          <Text style={styles.modeButtonDesc}>
            Offerを受け取ってAnswerを返信
          </Text>
        </TouchableOpacity>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📋 必要な情報</Text>
          <Text style={styles.infoText}>
            1. SDP Offer（発信側→受信側）{'\n'}
            2. SDP Answer（受信側→発信側）{'\n'}
            3. ICE候補（両方向、複数個）{'\n'}
            {'\n'}
            これらをメール、SMS、メッセージアプリなどで交換します
          </Text>
        </View>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  modeButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  modeButtonTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  modeButtonDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

