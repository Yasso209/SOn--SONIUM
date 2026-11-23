import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, View, ActivityIndicator, TouchableOpacity, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { colors } from '../src/theme/tokens';

export default function JoinCrewScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const [message, setMessage] = useState('Joining your crew...');
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!supabase) throw new Error('SONIUM needs its Supabase connection before invite links can be used.');
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) { const { error } = await supabase.auth.signInAnonymously(); if (error) throw error; }
        if (!code) throw new Error('This invite link does not contain a crew code.');
        const { error } = await supabase.rpc('join_crew', { p_code: String(code) });
        if (error && !error.message.toLowerCase().includes('duplicate')) throw error;
        if (active) setMessage('You are in! Opening SONIUM...');
        setTimeout(() => { if (active) router.replace('/'); }, 900);
      } catch (e: any) { if (active) setMessage(e?.message || 'Could not join this crew.'); }
      finally { if (active) setBusy(false); }
    })();
    return () => { active = false; };
  }, [code]);
  return <SafeAreaView style={{flex:1,backgroundColor:colors.dark.bg,justifyContent:'center',padding:24}}><StatusBar barStyle="light-content"/><View style={{alignItems:'center',gap:14}}><View style={{width:64,height:64,borderRadius:18,backgroundColor:colors.dark.accent,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.dark.accentInk,fontSize:32,fontWeight:'900'}}>S.</Text></View><Text style={{color:colors.dark.fg,fontSize:23,fontWeight:'900'}}>SONIUM</Text>{busy&&<ActivityIndicator color={colors.dark.accent}/>}<Text style={{color:colors.dark.muted,textAlign:'center',lineHeight:22}}>{message}</Text>{!busy&&<TouchableOpacity onPress={()=>router.replace('/')} style={{paddingHorizontal:22,paddingVertical:12,backgroundColor:colors.dark.accent,borderRadius:24}}><Text style={{color:colors.dark.accentInk,fontWeight:'900'}}>Open app</Text></TouchableOpacity>}</View></SafeAreaView>;
}
