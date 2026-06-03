import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, ActivityIndicator, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '../navigation/GamesStack';
import apiClient from '../api/client';
import type { GameSession, GameAnswer, GameResult } from '@vocabjp/shared';

type Props = NativeStackScreenProps<GamesStackParamList, 'Match'>;

interface Tile { id: string; text: string; wordId: string; side: 'jp' | 'en'; matched: boolean; }

function MatchTile({ tile, selected, wrong, onPress }: { tile: Tile; selected: boolean; wrong: boolean; onPress: () => void }) {
  const shake = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (wrong) { Animated.sequence([Animated.timing(shake,{toValue:6,duration:60,useNativeDriver:true}),Animated.timing(shake,{toValue:-6,duration:60,useNativeDriver:true}),Animated.timing(shake,{toValue:0,duration:60,useNativeDriver:true})]).start(); } }, [wrong]);
  useEffect(() => { if (tile.matched) Animated.timing(scale,{toValue:0,duration:220,useNativeDriver:true}).start(); }, [tile.matched]);
  const border = wrong ? '#ef4444' : selected ? '#7c3aed' : 'rgba(255,255,255,0.09)';
  const bg = wrong ? 'rgba(239,68,68,0.12)' : selected ? 'rgba(109,40,217,0.18)' : 'rgba(18,18,42,0.85)';
  const col = wrong ? '#ef4444' : selected ? '#a78bfa' : '#d1d5db';
  return (
    <Animated.View style={{ transform:[{translateX:shake},{scale}], marginBottom:8 }}>
      <TouchableOpacity onPress={onPress} disabled={tile.matched} activeOpacity={0.8}>
        <BlurView intensity={14} tint="dark" style={{ borderRadius:14, overflow:'hidden', borderWidth:selected||wrong?2:1, borderColor:border }}>
          <View style={{ backgroundColor:bg, paddingVertical:14, paddingHorizontal:12, minHeight:54, justifyContent:'center' }}>
            <Text style={{ color:col, fontSize:13, fontWeight:'500', textAlign:'center' }}>{tile.text}</Text>
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function MatchScreen({ route, navigation }: Props) {
  const { topicId, bookId, dueOnly } = route.params;
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<GameSession|null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string|null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selectedA, setSelectedA] = useState<Tile|null>(null);
  const [wrongPair, setWrongPair] = useState<[string,string]|null>(null);
  const [matched, setMatched] = useState(0);
  const [answers, setAnswers] = useState<GameAnswer[]>([]);
  const isAnimating = useRef(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get<GameSession>('/games/session', { params: { type:'MATCH', topicId, bookId, limit:8, ...(dueOnly?{dueOnly:'true'}:{}) } });
        const words = res.data.words;
        const jp: Tile[] = words.map(w=>({id:`jp-${w.id}`,text:w.japaneseWord,wordId:w.id,side:'jp',matched:false}));
        const en: Tile[] = words.map(w=>({id:`en-${w.id}`,text:w.meaning,wordId:w.id,side:'en',matched:false}));
        setTiles([...jp.sort(()=>Math.random()-0.5),...en.sort(()=>Math.random()-0.5)]);
        setSession(res.data);
      } catch(e:any) { setLoadError(e?.response?.data?.error ?? "O'yinni boshlab bo'lmadi."); }
      finally { setLoading(false); }
    })();
  }, []);

  const submitGame = useCallback(async (finalAnswers: GameAnswer[]) => {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post<GameResult>('/games/submit', { sessionId:session.sessionId, answers:finalAnswers });
      navigation.replace('Result', { result:res.data, mode:'MATCH', sourceScreen:'Match' });
    } catch {
      navigation.replace('Result', { result:{ sessionId:session.sessionId, gameType:'MATCH', totalQuestions:finalAnswers.length, totalCorrect:0, accuracy:0, xpEarned:0, coinsEarned:0, badgesEarned:[], srsUpdates:[] }, mode:'MATCH', sourceScreen:'Match' });
    } finally { setSubmitting(false); }
  }, [session]);

  const handleSelect = useCallback((tile: Tile) => {
    if (isAnimating.current || tile.matched) return;
    if (!selectedA) { setSelectedA(tile); return; }
    if (selectedA.side === tile.side) { setSelectedA(tile); return; }
    const timeMs = Date.now() - startedAt.current;
    if (selectedA.wordId === tile.wordId) {
      isAnimating.current = true;
      const enTile = tile.side==='en' ? tile : selectedA;
      const newAnswer: GameAnswer = { wordId:tile.wordId, answer:enTile.text, timeMs };
      const updatedAnswers = [...answers, newAnswer];
      setTiles(prev=>prev.map(t=>t.wordId===tile.wordId?{...t,matched:true}:t));
      setSelectedA(null); setAnswers(updatedAnswers);
      const nm = matched+1; setMatched(nm);
      setTimeout(() => { isAnimating.current=false; if(session && nm>=session.words.length) submitGame(updatedAnswers); }, 300);
    } else {
      isAnimating.current = true;
      setWrongPair([selectedA.id, tile.id]);
      const enTile = tile.side==='en' ? tile : selectedA;
      setAnswers(prev=>[...prev,{wordId:selectedA.wordId,answer:enTile.text,timeMs}]);
      setTimeout(() => { setWrongPair(null); setSelectedA(null); isAnimating.current=false; }, 650);
    }
  }, [selectedA, matched, answers, session, submitGame]);

  if (loading) return <View style={{flex:1,backgroundColor:'#0a0a1a',alignItems:'center',justifyContent:'center',gap:14}}><ActivityIndicator size="large" color="#f59e0b"/><Text style={{color:'#6b7280'}}>Yuklanmoqda…</Text></View>;
  if (loadError||!session) return <View style={{flex:1,backgroundColor:'#0a0a1a',alignItems:'center',justifyContent:'center',padding:32,gap:14}}><Text style={{fontSize:40}}>😵</Text><Text style={{color:'#f9fafb',fontSize:16,fontWeight:'700',textAlign:'center'}}>{loadError??"So'zlar mavjud emas"}</Text><TouchableOpacity onPress={()=>navigation.goBack()} style={{backgroundColor:'rgba(245,158,11,0.15)',borderRadius:14,paddingHorizontal:24,paddingVertical:12,borderWidth:1,borderColor:'#f59e0b'}}><Text style={{color:'#f59e0b',fontWeight:'600'}}>Orqaga qaytish</Text></TouchableOpacity></View>;
  if (submitting) return <View style={{flex:1,backgroundColor:'#0a0a1a',alignItems:'center',justifyContent:'center',gap:14}}><ActivityIndicator size="large" color="#10b981"/><Text style={{color:'#6b7280'}}>Saqlanmoqda…</Text></View>;

  const progress = (matched/session.words.length)*100;
  const jpTiles = tiles.filter(t=>t.side==='jp');
  const enTiles = tiles.filter(t=>t.side==='en');

  return (
    <View style={{flex:1,backgroundColor:'#0a0a1a'}}>
      <View style={{flex:1,paddingTop:insets.top,paddingHorizontal:16}}>
        <View style={{flexDirection:'row',alignItems:'center',paddingTop:12,paddingBottom:16,gap:14}}>
          <TouchableOpacity onPress={()=>navigation.goBack()} style={{padding:4}}><Ionicons name="close" size={24} color="#4b5563"/></TouchableOpacity>
          <View style={{flex:1,height:6,backgroundColor:'#1f2937',borderRadius:3}}>
            <View style={{height:6,borderRadius:3,width:`${progress}%`,backgroundColor:'#f59e0b'}}/>
          </View>
          <Text style={{color:'#6b7280',fontSize:13,fontWeight:'600'}}>{matched}/{session.words.length}</Text>
        </View>
        <Text style={{color:'#9ca3af',fontSize:13,textAlign:'center',marginBottom:16}}>Yaponcha so'zni bosing, so'ng uning tarjimasini tanlang</Text>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
          <View style={{flexDirection:'row',gap:10}}>
            <View style={{flex:1}}>{jpTiles.map(t=><MatchTile key={t.id} tile={t} selected={selectedA?.id===t.id} wrong={wrongPair?.includes(t.id)??false} onPress={()=>handleSelect(t)}/>)}</View>
            <View style={{flex:1}}>{enTiles.map(t=><MatchTile key={t.id} tile={t} selected={selectedA?.id===t.id} wrong={wrongPair?.includes(t.id)??false} onPress={()=>handleSelect(t)}/>)}</View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
