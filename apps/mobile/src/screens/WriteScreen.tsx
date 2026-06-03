import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Animated, ActivityIndicator, BackHandler } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '../navigation/GamesStack';
import apiClient from '../api/client';
import type { GameSession, GameAnswer, GameResult } from '@vocabjp/shared';

type Props = NativeStackScreenProps<GamesStackParamList, 'Write'>;
type WriteState = 'idle' | 'correct' | 'wrong';

export default function WriteScreen({ route, navigation }: Props) {
  const { topicId, bookId, dueOnly } = route.params;
  const insets = useSafeAreaInsets();

  const [session, setSession]       = useState<GameSession|null>(null);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState<string|null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [index,   setIndex]   = useState(0);
  const [input,   setInput]   = useState('');
  const [state,   setState]   = useState<WriteState>('idle');
  const [answers, setAnswers] = useState<GameAnswer[]>([]);

  const inputRef  = useRef<TextInput>(null);
  const startedAt = useRef(Date.now());
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => handler.remove();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get<GameSession>('/games/session', {
          params: { type:'WRITE', topicId, bookId, limit:10, ...(dueOnly?{dueOnly:'true'}:{}) },
        });
        setSession(res.data);
      } catch(e:any) { setLoadError(e?.response?.data?.error ?? "O'yinni boshlab bo'lmadi."); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    setInput(''); setState('idle');
    startedAt.current = Date.now();
    setTimeout(() => inputRef.current?.focus(), 150);
    if (session) {
      Animated.timing(progressAnim, { toValue: (index+1)/session.words.length, duration:400, useNativeDriver:false }).start();
    }
  }, [index, session]);

  const submitGame = useCallback(async (finalAnswers: GameAnswer[]) => {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post<GameResult>('/games/submit', { sessionId:session.sessionId, answers:finalAnswers });
      navigation.replace('Result', { result:res.data, mode:'WRITE', sourceScreen:'Write' });
    } catch {
      navigation.replace('Result', { result:{ sessionId:session.sessionId, gameType:'WRITE', totalQuestions:finalAnswers.length, totalCorrect:0, accuracy:0, xpEarned:0, coinsEarned:0, badgesEarned:[], srsUpdates:[] }, mode:'WRITE', sourceScreen:'Write' });
    } finally { setSubmitting(false); }
  }, [session]);

  const handleSubmit = useCallback(() => {
    if (!session || state !== 'idle' || !input.trim()) return;
    const timeMs = Date.now() - startedAt.current;
    const word = session.words[index];
    const trimmed = input.trim().toLowerCase();
    const correct = word.meaning.toLowerCase();
    const isCorrect = correct.includes(trimmed) || trimmed.includes(correct) || trimmed === correct;

    setState(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
      Animated.sequence([
        Animated.timing(shakeAnim,{toValue:8,duration:60,useNativeDriver:true}),
        Animated.timing(shakeAnim,{toValue:-8,duration:60,useNativeDriver:true}),
        Animated.timing(shakeAnim,{toValue:8,duration:60,useNativeDriver:true}),
        Animated.timing(shakeAnim,{toValue:0,duration:60,useNativeDriver:true}),
      ]).start();
    }

    const newAnswer: GameAnswer = { wordId:word.id, answer:input.trim(), timeMs };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    setTimeout(() => {
      if (index+1 >= session.words.length) { submitGame(updatedAnswers); }
      else { setIndex(i=>i+1); }
    }, 1100);
  }, [session, state, input, index, answers, submitGame, shakeAnim]);

  if (loading) return <View style={{flex:1,backgroundColor:'#0a0a1a',alignItems:'center',justifyContent:'center',gap:14}}><ActivityIndicator size="large" color="#10b981"/><Text style={{color:'#6b7280'}}>Yuklanmoqda…</Text></View>;
  if (loadError||!session) return (
    <View style={{flex:1,backgroundColor:'#0a0a1a',alignItems:'center',justifyContent:'center',padding:32,gap:14}}>
      <Text style={{fontSize:40}}>😵</Text>
      <Text style={{color:'#f9fafb',fontSize:16,fontWeight:'700',textAlign:'center'}}>{loadError??"So'zlar mavjud emas"}</Text>
      <TouchableOpacity onPress={()=>navigation.goBack()} style={{backgroundColor:'rgba(16,185,129,0.15)',borderRadius:14,paddingHorizontal:24,paddingVertical:12,borderWidth:1,borderColor:'#10b981'}}>
        <Text style={{color:'#10b981',fontWeight:'600'}}>Orqaga qaytish</Text>
      </TouchableOpacity>
    </View>
  );
  if (submitting) return <View style={{flex:1,backgroundColor:'#0a0a1a',alignItems:'center',justifyContent:'center',gap:14}}><ActivityIndicator size="large" color="#10b981"/><Text style={{color:'#6b7280'}}>Saqlanmoqda…</Text></View>;

  const word = session.words[index];
  const total = session.words.length;

  return (
    <View style={{flex:1,backgroundColor:'#0a0a1a'}}>
      <View style={{flex:1,paddingTop:insets.top,paddingHorizontal:20}}>

        {/* Top bar */}
        <View style={{flexDirection:'row',alignItems:'center',paddingTop:12,paddingBottom:18,gap:14}}>
          <TouchableOpacity onPress={()=>navigation.goBack()} style={{padding:4}}><Ionicons name="close" size={24} color="#4b5563"/></TouchableOpacity>
          <View style={{flex:1,height:6,backgroundColor:'#1f2937',borderRadius:3,overflow:'hidden'}}>
            <Animated.View style={{
              height:6,borderRadius:3,backgroundColor:'#10b981',
              width:progressAnim.interpolate({inputRange:[0,1],outputRange:['0%','100%']}),
            }}/>
          </View>
          <Text style={{color:'#6b7280',fontSize:13,fontWeight:'600'}}>{index+1}/{total}</Text>
        </View>

        {/* Word display card */}
        <BlurView intensity={22} tint="dark" style={{borderRadius:28,overflow:'hidden',borderWidth:1,borderColor:'rgba(16,185,129,0.22)',marginBottom:24}}>
          <LinearGradient colors={['rgba(18,18,48,0.95)','rgba(8,8,24,0.98)']} style={{paddingVertical:36,paddingHorizontal:28,alignItems:'center'}}>
            <Text style={{color:'#6b7280',fontSize:12,fontWeight:'700',letterSpacing:1.5,textTransform:'uppercase',marginBottom:14}}>
              Tarjimasini yozing
            </Text>
            <Text style={{color:'#f9fafb',fontSize:52,fontWeight:'700',letterSpacing:4,textShadowColor:'rgba(16,185,129,0.3)',textShadowOffset:{width:0,height:0},textShadowRadius:20}}>
              {word.japaneseWord}
            </Text>
            {word.hiragana !== word.japaneseWord && (
              <Text style={{color:'#6ee7b7',fontSize:18,letterSpacing:2,marginTop:8}}>{word.hiragana}</Text>
            )}
          </LinearGradient>
        </BlurView>

        {/* Input */}
        <Animated.View style={{transform:[{translateX:shakeAnim}],marginBottom:14}}>
          <BlurView intensity={18} tint="dark" style={{
            borderRadius:18,overflow:'hidden',borderWidth:2,
            borderColor: state==='correct'?'#10b981':state==='wrong'?'#ef4444':'rgba(16,185,129,0.25)',
          }}>
            <View style={{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(10,10,26,0.85)',paddingHorizontal:16,paddingVertical:4}}>
              <TextInput
                ref={inputRef}
                value={input}
                onChangeText={t => { if(state==='idle') setInput(t); }}
                onSubmitEditing={handleSubmit}
                placeholder="Tarjimasini yozing…"
                placeholderTextColor="#374151"
                style={{flex:1,color:'#f3f4f6',fontSize:16,paddingVertical:14}}
                returnKeyType="done"
                editable={state==='idle'}
              />
              <TouchableOpacity onPress={handleSubmit} disabled={!input.trim()||state!=='idle'}>
                <Ionicons name="send" size={20} color={input.trim()&&state==='idle'?'#10b981':'#374151'}/>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>

        {/* Feedback */}
        {state !== 'idle' && (
          <BlurView intensity={16} tint="dark" style={{
            borderRadius:16,overflow:'hidden',borderWidth:1,
            borderColor:state==='correct'?'rgba(16,185,129,0.4)':'rgba(239,68,68,0.4)',
            marginBottom:12,
          }}>
            <View style={{flexDirection:'row',alignItems:'flex-start',gap:10,backgroundColor:state==='correct'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',padding:14}}>
              <Ionicons name={state==='correct'?'checkmark-circle':'close-circle'} size={20} color={state==='correct'?'#10b981':'#ef4444'}/>
              <View style={{flex:1}}>
                <Text style={{color:state==='correct'?'#10b981':'#ef4444',fontWeight:'700',fontSize:14}}>
                  {state==='correct'?"To'g'ri!":"Noto'g'ri"}
                </Text>
                {state==='wrong' && (
                  <Text style={{color:'#9ca3af',fontSize:13,marginTop:2}}>
                    Javob: <Text style={{color:'#f3f4f6',fontWeight:'600'}}>{word.meaning}</Text>
                  </Text>
                )}
              </View>
            </View>
          </BlurView>
        )}

        {/* Example sentence (shown after answer) */}
        {state!=='idle' && word.exampleSentence && (
          <BlurView intensity={14} tint="dark" style={{borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,255,255,0.07)'}}>
            <View style={{backgroundColor:'rgba(10,10,26,0.8)',padding:14,gap:4}}>
              <Text style={{color:'#d1d5db',fontSize:13,lineHeight:20,fontStyle:'italic'}}>{word.exampleSentence}</Text>
              {word.exampleTranslation && <Text style={{color:'#6b7280',fontSize:12}}>{word.exampleTranslation}</Text>}
            </View>
          </BlurView>
        )}
      </View>
    </View>
  );
}
