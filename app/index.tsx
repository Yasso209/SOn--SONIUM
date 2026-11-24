import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Modal, Pressable, SafeAreaView, ScrollView, Share, StatusBar, StyleSheet, Platform, Switch, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import mascot from '../assets/mascot.webp';
import { colors, ThemeMode } from '../src/theme/tokens';
import { isSupabaseConfigured, supabase } from '../src/lib/supabase';

const TASK_SUGGESTIONS = [
  {title:'Drink 2L of water',points:5,icon:'water-outline',subtasks:[]},
  {title:'Read for 20 minutes',points:10,icon:'book-outline',subtasks:[]},
  {title:'Workout',points:20,icon:'barbell-outline',subtasks:['Warm up','Main workout','Stretch']},
  {title:'Plan tomorrow',points:5,icon:'calendar-outline',subtasks:[]},
  {title:'Daily prayers',points:15,icon:'moon-outline',subtasks:['Fajr','Dhuhr','Asr','Maghrib','Isha']},
  {title:'Study for 1 hour',points:10,icon:'school-outline',subtasks:['First 25 minutes','Short break','Second 25 minutes']},
];
const PRAYERS=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
const STICKERS=['🔥','💪','🏆','⚡','🎯','👏','🚀','💚'];
const STORE='sonium-v1-state';
type Tab='Home'|'Stats'|'Crew'|'Settings';
type Crew={id:string;name:string;invite_code:string;start_date:string;days:number;penalty?:string;penalty_custom?:string|null};
type Msg={id:string|number;user_id:string;body:string|null;sticker:string|null;created_at:string};
type PersonalTask={id:string;user_id?:string;crew_id?:string;title:string;details:string|null;points:number;icon:string;subtasks:string[];reminder_enabled:boolean;reminder_time:string|null;sort_order:number};
type CrewMember={user_id:string;name:string;avatar_url?:string|null};

Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowAlert:true,shouldShowBanner:true,shouldShowList:true,shouldPlaySound:false,shouldSetBadge:false})});

export default function App(){
 const [tab,setTab]=useState<Tab>('Home');
 const [themeMode,setThemeMode]=useState<ThemeMode>('dark');
 const [name,setName]=useState('Player');
 const [avatar,setAvatar]=useState<string|null>(null);
 const [done,setDone]=useState<string[]>([]);
 const [subtaskDone,setSubtaskDone]=useState<string[]>([]);
 const [tasks,setTasks]=useState<PersonalTask[]>([]);
 const [totalEarned,setTotalEarned]=useState(0);
 const [activeTask,setActiveTask]=useState<PersonalTask|null>(null);
 const [taskTitle,setTaskTitle]=useState('');
 const [taskDetails,setTaskDetails]=useState('');
 const [taskPoints,setTaskPoints]=useState('10');
 const [taskIcon,setTaskIcon]=useState('checkmark-circle-outline');
 const [taskSubtasks,setTaskSubtasks]=useState('');
 const [taskReminder,setTaskReminder]=useState(false);
 const [taskReminderTime,setTaskReminderTime]=useState('20:00');
 const [taskSaving,setTaskSaving]=useState(false);
 const [avatarPath,setAvatarPath]=useState<string|null>(null);
 const [progressPeek,setProgressPeek]=useState(false);
 const progressAnim=useRef(new Animated.Value(0)).current;
 const [proofReviewBusy,setProofReviewBusy]=useState<string|null>(null);
 const [prayers,setPrayers]=useState<string[]>([]);
 const [day,setDay]=useState(1);
 const [currentDay,setCurrentDay]=useState(1);
 const [challengeActive,setChallengeActive]=useState(true);
 const [crew,setCrew]=useState<Crew|null>(null);
 const [crews,setCrews]=useState<Crew[]>([]);
 const [activeCrewId,setActiveCrewId]=useState<string|null>(null);
 const [members,setMembers]=useState<CrewMember[]>([]);
 const [board,setBoard]=useState<any[]>([]);
 const [messages,setMessages]=useState<Msg[]>([]);
 const [sharedTasks,setSharedTasks]=useState<any[]>([]);
 const [newSharedTask,setNewSharedTask]=useState('');
 const [message,setMessage]=useState('');
 const [crewName,setCrewName]=useState('');
 const [inviteCode,setInviteCode]=useState('');
 const [rename,setRename]=useState('');
 const [penaltyCustom,setPenaltyCustom]=useState('');
 const [showDays,setShowDays]=useState(false);
 const [showPrayers,setShowPrayers]=useState(false);
 const [modal,setModal]=useState<'create'|'join'|'privacy'|'account'|'report'|'task'|null>(null);
 const [reportUser,setReportUser]=useState('');
 const [reportNote,setReportNote]=useState('');
 const [reportReason,setReportReason]=useState('abuse');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [accountEmail,setAccountEmail]=useState('');
 const [profileEdit,setProfileEdit]=useState(false);
 const [reminder,setReminder]=useState(false);
 const [loading,setLoading]=useState(true);
 const [userId,setUserId]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 const [weeklyPoints,setWeeklyPoints]=useState<number[]>([0,0,0,0,0,0,0]);
 const [dayProgress,setDayProgress]=useState<number[]>(Array(14).fill(0));
 const [weekLabels,setWeekLabels]=useState<string[]>(['M','T','W','T','F','S','S']);
 const [streak,setStreak]=useState(0);
 const [isAdmin,setIsAdmin]=useState(false);
 const [adminReports,setAdminReports]=useState<any[]>([]);
 const [adminProfiles,setAdminProfiles]=useState<any[]>([]);
 const [adminCrews,setAdminCrews]=useState<any[]>([]);
 const [adminMessages,setAdminMessages]=useState<any[]>([]);
 const systemScheme=useColorScheme();
 const isLight=themeMode==='light'||(themeMode==='system'&&systemScheme==='light');
 const C=isLight?colors.light:colors.dark;
 const completed=tasks.filter(t=>done.includes(t.id)).length;
 const progress=tasks.length?Math.round(completed/tasks.length*100):0;
 const totalPoints=useMemo(()=>tasks.filter(t=>done.includes(t.id)).reduce((s,t)=>s+t.points,0),[done,tasks]);
 const weekPoints=weeklyPoints.reduce((sum,n)=>sum+n,0);
 const crewPoints=board.reduce((sum,p)=>sum+Number(p.points||0),0);
 const myRank=Math.max(0,board.findIndex(p=>p.user_id===userId)+1);
 const daysLeft=crew?Math.max(0,(crew.days||14)-currentDay):14-currentDay;
 const online=Boolean(isSupabaseConfigured&&userId);
 const toast=(s:string)=>{setNotice(s);setTimeout(()=>setNotice(''),2500);};
 const saveLocal=async(patch:Record<string,unknown>)=>{const raw=await AsyncStorage.getItem(STORE);await AsyncStorage.setItem(STORE,JSON.stringify({...(raw ? JSON.parse(raw) : {}), ...patch}));};

 useEffect(()=>{let active=true;(async()=>{try{
  const raw=await AsyncStorage.getItem(STORE);
  if(raw&&active){const s=JSON.parse(raw);setName(s.name||'Player');setAvatar(s.avatar||null);setDone(s.done||[]);setSubtaskDone(s.subtaskDone||[]);setThemeMode(s.themeMode||'dark');}
  if(supabase){
   const {data:sess}=await supabase.auth.getSession();let uid=sess.session?.user.id;setAccountEmail(sess.session?.user.email||'');
   if(!uid){const {data,error}=await supabase.auth.signInAnonymously();if(error)throw error;uid=data.user?.id;}
   if(uid&&active){setUserId(uid);const {data:p}=await supabase.from('profiles').select('name,avatar_path').eq('id',uid).maybeSingle();if(p?.name)setName(p.name);if(p?.avatar_path){setAvatarPath(p.avatar_path);const {data:a}=await supabase.storage.from('avatars').createSignedUrl(p.avatar_path,3600);if(a?.signedUrl)setAvatar(a.signedUrl);}}
  }
 }catch(e:any){toast(e?.message||'Could not start SONIUM');}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[]);
 useEffect(()=>{saveLocal({name,avatar,done,subtaskDone,themeMode}).catch(()=>{});},[name,avatar,done,subtaskDone,themeMode]);
 useEffect(()=>{Animated.spring(progressAnim,{toValue:progressPeek?1:0,useNativeDriver:false,friction:8,tension:75}).start();},[progressPeek,progressAnim]);
 const refreshStats=async(cId:string,uid:string)=>{
  if(!supabase)return;
  const since=new Date();since.setDate(since.getDate()-6);since.setHours(0,0,0,0);
  const {data}=await supabase.from('completions').select('points,done_at').eq('crew_id',cId).eq('user_id',uid).gte('done_at',since.toISOString());
  const {data:all}=await supabase.from('completions').select('points').eq('crew_id',cId).eq('user_id',uid);
  setTotalEarned((all||[]).reduce((sum:any,r:any)=>sum+Number(r.points||0),0));
  const labels:string[]=[];const values=Array(7).fill(0);
  for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);labels.push(d.toLocaleDateString('en-US',{weekday:'short'}));}
  const days=new Set<string>();
  (data||[]).forEach((r:any)=>{const d=new Date(r.done_at);d.setHours(0,0,0,0);days.add(d.toDateString());const i=Math.floor((d.getTime()-since.getTime())/86400000);if(i>=0&&i<7)values[i]+=Number(r.points||0);});
  setWeeklyPoints(values);setWeekLabels(labels);
  let cursor=new Date();cursor.setHours(0,0,0,0);if(!days.has(cursor.toDateString()))cursor.setDate(cursor.getDate()-1);
  let n=0;while(days.has(cursor.toDateString())&&n<30){n++;cursor.setDate(cursor.getDate()-1);}setStreak(n);
 };
 const loadDayRecords=async(dayNumber:number)=>{
  if(!supabase||!userId||!crew)return;
  const {data:checks,error}=await supabase.from('completions').select('task_id').eq('crew_id',crew.id).eq('user_id',userId).eq('day',dayNumber);
  if(error){toast(error.message);return;}
  const ids=(checks||[]).map((x:any)=>String(x.task_id));
  setDone(ids.filter((id:string)=>!id.includes(':sub:')&&!id.startsWith('prayers_')));
  setSubtaskDone(ids.filter((id:string)=>id.includes(':sub:')));
  setDay(dayNumber);
 };
 const loadCrew=async()=>{
  const client=supabase;if(!client||!userId)return;
  const {data:adminResult}=await client.rpc('is_admin');const admin=adminResult===true;setIsAdmin(admin);
  if(admin){
   const {data:rs}=await client.from('reports').select('*').order('created_at',{ascending:false}).limit(50);
   const {data:ps}=await client.from('profiles').select('id,name,banned').order('created_at',{ascending:false}).limit(100);
   const {data:cs}=await client.from('crews').select('id,name').order('created_at',{ascending:false}).limit(100);
   const {data:cms}=await client.from('crew_members').select('crew_id,user_id');
   const {data:msgs}=await client.from('messages').select('id,crew_id,user_id,body,sticker').order('created_at',{ascending:false}).limit(60);
   if(rs)setAdminReports(rs);if(ps)setAdminProfiles(ps);if(cs)setAdminCrews(cs.map((x:any)=>({...x,members:(cms||[]).filter((m:any)=>m.crew_id===x.id)})));if(msgs)setAdminMessages(msgs);
  }
  const {data:ms}=await client.from('crew_members').select('crew_id').eq('user_id',userId);
  const ids=(ms||[]).map((x:any)=>x.crew_id);
  if(!ids.length){setCrews([]);setCrew(null);setMembers([]);setBoard([]);setMessages([]);setSharedTasks([]);setTasks([]);setDone([]);setSubtaskDone([]);setTotalEarned(0);return;}
  const {data:cs}=await client.from('crews').select('id,name,invite_code,start_date,days,penalty,penalty_custom').in('id',ids);
  const list=(cs||[]) as Crew[];setCrews(list);
  const selected=list.find(c=>c.id===activeCrewId)||list[0];if(!selected)return;
  setCrew(selected);setActiveCrewId(selected.id);
  const startDate=new Date(selected.start_date+'T00:00:00');const today=new Date();today.setHours(0,0,0,0);
  const elapsed=Math.floor((today.getTime()-startDate.getTime())/86400000)+1;
  const activeDay=Math.max(1,Math.min(selected.days||14,elapsed));
  setCurrentDay(activeDay);setDay(activeDay);setChallengeActive(elapsed>=1&&elapsed<=(selected.days||14));
  const [{data:taskRows},{data:checks},{data:allCompletions}]=await Promise.all([
   client.from('personal_tasks').select('id,user_id,crew_id,title,details,points,icon,subtasks,reminder_enabled,reminder_time,sort_order').eq('crew_id',selected.id).eq('user_id',userId).order('sort_order').order('created_at'),
   client.from('completions').select('task_id').eq('crew_id',selected.id).eq('user_id',userId).eq('day',activeDay),
   client.from('completions').select('points,day,task_id').eq('crew_id',selected.id).eq('user_id',userId)
  ]);
  setTasks((taskRows||[]).map((t:any)=>({...t,subtasks:Array.isArray(t.subtasks)?t.subtasks:[]})) as PersonalTask[]);
  const completionIds=(checks||[]).map((x:any)=>String(x.task_id));
  setDone(completionIds.filter((id:string)=>!id.includes(':sub:')&&!id.startsWith('prayers_')));
  setSubtaskDone(completionIds.filter((id:string)=>id.includes(':sub:')));
  setTotalEarned((allCompletions||[]).reduce((sum:any,r:any)=>sum+Number(r.points||0),0));
  const dayItems=Array.from({length:14},()=>new Set<string>());(allCompletions||[]).forEach((r:any)=>{const d=Number(r.day);if(d>=1&&d<=14&&!String(r.task_id).includes(':sub:')&&Number(r.points||0)>=0)dayItems[d-1].add(String(r.task_id));});setDayProgress(dayItems.map(s=>s.size));
  const {data:cm}=await client.from('crew_members').select('user_id').eq('crew_id',selected.id);
  const memberIds=(cm||[]).map((x:any)=>x.user_id);
  const {data:people}=await client.from('profiles').select('id,name,avatar_path').in('id',memberIds);
  if(people){const withAvatars=await Promise.all(people.map(async(p:any)=>{let url=null;if(p.avatar_path){const {data}=await client.storage.from('avatars').createSignedUrl(p.avatar_path,3600);url=data?.signedUrl||null;}return {user_id:p.id,name:p.name||'Player',avatar_url:url};}));setMembers(withAvatars);}
  const {data:lb}=await client.from('crew_leaderboard').select('user_id,name,points').eq('crew_id',selected.id).order('points',{ascending:false});if(lb)setBoard(lb);
  const {data:msgs}=await client.from('messages').select('id,user_id,body,sticker,created_at').eq('crew_id',selected.id).order('created_at',{ascending:false}).limit(50);if(msgs)setMessages(msgs.reverse());
  const {data:shared}=await client.from('shared_tasks').select('id,title,points,created_by,created_at,shared_proofs(id,user_id,photo_path,shared_proof_reviews(id,reviewer_id,approved,note))').eq('crew_id',selected.id).order('created_at',{ascending:false});
  if(shared){const enriched=await Promise.all(shared.map(async(t:any)=>({...t,shared_proofs:await Promise.all((t.shared_proofs||[]).map(async(p:any)=>{const {data}=await client.storage.from('proofs').createSignedUrl(p.photo_path,3600);return {...p,signedUrl:data?.signedUrl||null,reviews:p.shared_proof_reviews||[]};}))})));setSharedTasks(enriched);}
  await refreshStats(selected.id,userId);
 };
 useEffect(()=>{loadCrew();},[userId,activeCrewId]);
 useEffect(()=>{if(!supabase||!crew)return;const ch=supabase.channel('crew-'+crew.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'crew_id=eq.'+crew.id},p=>setMessages(old=>old.some(m=>m.id===(p.new as Msg).id)?old:[...old,p.new as Msg])).subscribe();return()=>{supabase?.removeChannel(ch);};},[crew?.id]);
 const openTaskEditor=(task?:PersonalTask)=>{
  setActiveTask(task||null);
  setTaskTitle(task?.title||'');
  setTaskDetails(task?.details||'');
  setTaskPoints(String(task?.points??10));
  setTaskIcon(task?.icon||'checkmark-circle-outline');
  setTaskSubtasks((task?.subtasks||[]).join('\n'));
  setTaskReminder(Boolean(task?.reminder_enabled));
  setTaskReminderTime(task?.reminder_time?.slice(0,5)||'20:00');
  setModal('task');
 };
 const syncTaskReminder=async(task:PersonalTask)=>{
  try{
   const scheduled=await Notifications.getAllScheduledNotificationsAsync();
   for(const n of scheduled){if(String(n.content.data?.taskId||'')===task.id)await Notifications.cancelScheduledNotificationAsync(n.identifier);}
   if(!task.reminder_enabled||!task.reminder_time)return;
   const perm=await Notifications.getPermissionsAsync();if(!perm.granted){const req=await Notifications.requestPermissionsAsync();if(!req.granted){toast('Allow notifications to activate this task reminder');return;}}
   if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('sonium-reminders',{name:'Task reminders',importance:Notifications.AndroidImportance.DEFAULT});
   const [hour,minute]=task.reminder_time.slice(0,5).split(':').map(Number);
   if(!Number.isInteger(hour)||!Number.isInteger(minute)||hour<0||hour>23||minute<0||minute>59)return;
   await Notifications.scheduleNotificationAsync({content:{title:'SONIUM · '+task.title,body:task.details||'Time for your task. Make today count.',data:{taskId:task.id}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DAILY,hour,minute,channelId:'sonium-reminders'}});
  }catch(e:any){toast(e?.message||'Could not schedule task reminder');}
 };
 const saveTask=async()=>{
  if(!supabase||!userId||!crew){toast('Create or join a crew before adding your personal tasks');return;}
  const title=taskTitle.trim();const points=Number(taskPoints);
  if(!title)return toast('Write a task name first');
  if(!Number.isInteger(points)||points<0||points>100)return toast('Points must be between 0 and 100');
  if(taskReminder&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(taskReminderTime))return toast('Reminder time must use HH:MM (24-hour)');
  const subitems=taskSubtasks.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,12);
  setTaskSaving(true);
  try{
   const payload={user_id:userId,crew_id:crew.id,title:title.slice(0,80),details:taskDetails.trim()||null,points,icon:taskIcon,subtasks:subitems,reminder_enabled:taskReminder,reminder_time:taskReminder?taskReminderTime+':00':null,sort_order:activeTask?.sort_order??tasks.length};
   let saved:PersonalTask|null=null;
   if(activeTask){const {data,error}=await supabase.from('personal_tasks').update(payload).eq('id',activeTask.id).select('*').single();if(error)throw error;saved={...data,subtasks:Array.isArray(data.subtasks)?data.subtasks:[]};}
   else{const {data,error}=await supabase.from('personal_tasks').insert(payload).select('*').single();if(error)throw error;saved={...data,subtasks:Array.isArray(data.subtasks)?data.subtasks:[]};}
   if(saved){setTasks(old=>activeTask?old.map(t=>t.id===saved!.id?saved!:t):[...old,saved!]);await syncTaskReminder(saved);}
   setModal(null);setActiveTask(null);toast(activeTask?'Task updated':'Your task was added');
  }catch(e:any){toast(e?.message||'Could not save task');}finally{setTaskSaving(false);}
 };
 const deleteTask=(task:PersonalTask)=>Alert.alert('Delete task?', 'This removes the task from your personal list. Existing points already earned stay in your stats.',[
  {text:'Cancel',style:'cancel'},
  {text:'Delete',style:'destructive',onPress:async()=>{
   if(!supabase||!userId||!crew)return;
   await supabase.from('completions').delete().eq('user_id',userId).eq('crew_id',crew.id).like('task_id',task.id+':sub:%');
   await supabase.from('completions').delete().eq('user_id',userId).eq('crew_id',crew.id).eq('task_id',task.id);
   const {error}=await supabase.from('personal_tasks').delete().eq('id',task.id).eq('user_id',userId);
   if(error){toast(error.message);return;}
   const scheduled=await Notifications.getAllScheduledNotificationsAsync();for(const n of scheduled){if(String(n.content.data?.taskId||'')===task.id)await Notifications.cancelScheduledNotificationAsync(n.identifier);}
   setTasks(old=>old.filter(t=>t.id!==task.id));setDone(old=>old.filter(id=>id!==task.id));setSubtaskDone(old=>old.filter(id=>!id.startsWith(task.id+':sub:')));setModal(null);toast('Task deleted');
  }}
 ]);
 const toggleTask=async(id:string)=>{
  if(day!==currentDay||!challengeActive){toast('Only today can be checked off');return;}
  const task=tasks.find(t=>t.id===id);if(!task)return;
  if((task.subtasks||[]).length){setActiveTask(task);setShowPrayers(true);return;}
  const was=done.includes(id);
  if(supabase&&userId&&crew){
   const action=was?await supabase.from('completions').delete().match({user_id:userId,crew_id:crew.id,day:currentDay,task_id:id}):await supabase.from('completions').insert({user_id:userId,crew_id:crew.id,day:currentDay,task_id:id});
   if(action.error){toast(action.error.message);return;}
   await refreshStats(crew.id,userId);
  }
  setDone(old=>was?old.filter(x=>x!==id):[...old,id]);
  if(!was)toast('+'+task.points+' points · task completed');
 };
 const toggleSubtask=async(index:number)=>{
  if(!activeTask||!supabase||!userId||!crew)return;
  if(day!==currentDay||!challengeActive){toast('Only today can be checked off');return;}
  const key=activeTask.id+':sub:'+index;const was=subtaskDone.includes(key);const next=was?subtaskDone.filter(x=>x!==key):[...subtaskDone,key];
  const result=was
   ?await supabase.from('completions').delete().match({user_id:userId,crew_id:crew.id,day:currentDay,task_id:key})
   :await supabase.from('completions').insert({user_id:userId,crew_id:crew.id,day:currentDay,task_id:key});
  if(result.error){toast(result.error.message);return;}
  setSubtaskDone(next);
  const allDone=(activeTask.subtasks||[]).every((_,i)=>next.includes(activeTask.id+':sub:'+i));
  if(allDone){
   const {error}=await supabase.from('completions').upsert({user_id:userId,crew_id:crew.id,day:currentDay,task_id:activeTask.id},{onConflict:'user_id,crew_id,day,task_id',ignoreDuplicates:true});
   if(error){toast(error.message);return;}setDone(old=>old.includes(activeTask.id)?old:[...old,activeTask.id]);toast('+'+activeTask.points+' points · all steps done');
  }else{
   await supabase.from('completions').delete().match({user_id:userId,crew_id:crew.id,day:currentDay,task_id:activeTask.id});
   setDone(old=>old.filter(x=>x!==activeTask.id));
  }
  await refreshStats(crew.id,userId);
 };
 const voteProof=async(proofId:string,crewId:string,approved:boolean)=>{
  if(!supabase||!userId)return;setProofReviewBusy(proofId);
  const {error}=await supabase.from('shared_proof_reviews').upsert({proof_id:proofId,crew_id:crewId,reviewer_id:userId,approved},{onConflict:'proof_id,reviewer_id'});
  if(error)toast(error.message);else{toast(approved?'Marked as done correctly':'Marked as not complete');await loadCrew();}
  setProofReviewBusy(null);
 };
 const createCrew=async()=>{if(!crewName.trim()||!supabase)return;const {data,error}=await supabase.rpc('create_crew',{p_name:crewName.trim()});if(error)toast(error.message);else{setCrewName('');setModal(null);setActiveCrewId(data);toast('Crew created');}};
 const joinCrew=async()=>{if(!inviteCode.trim()||!supabase)return;const {data,error}=await supabase.rpc('join_crew',{p_code:inviteCode.trim()});if(error)toast(error.message);else{setInviteCode('');setModal(null);setActiveCrewId(data);toast('Joined crew');}};
 const sendMessage=async(body:string,sticker:string|null=null)=>{if(!supabase||!userId||!crew||(!body.trim()&&!sticker))return;const {data,error}=await supabase.from('messages').insert({crew_id:crew.id,user_id:userId,body:body.trim()||null,sticker}).select('id,user_id,body,sticker,created_at').single();if(error)toast(error.message);else if(data)setMessages(old=>old.some(m=>m.id===data.id)?old:[...old,data as Msg]);setMessage('');};
 const pickAvatar=async()=>{const p=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!p.granted)return toast('Photo permission is needed');const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.8});if(!r.canceled)setAvatar(r.assets[0].uri);};
 const saveProfile=async()=>{
  if(!name.trim())return toast('Enter your name');
  const value=name.trim().slice(0,24);setName(value);
  if(supabase&&userId){
   try{
    let savedPath=avatarPath;
    if(avatar&&/^(file:|content:)/.test(avatar)){
     const ext=avatar.toLowerCase().includes('.png')?'png':avatar.toLowerCase().includes('.webp')?'webp':'jpg';
     const path=userId+'/profile-'+Date.now()+'.'+ext;
     const blob=await(await fetch(avatar)).blob();
     const {error:uploadError}=await supabase.storage.from('avatars').upload(path,blob,{contentType:ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg',upsert:false});
     if(uploadError)throw uploadError;savedPath=path;
    }
    const {error}=await supabase.from('profiles').update({name:value,avatar_path:savedPath}).eq('id',userId);
    if(error)throw error;
    if(savedPath){setAvatarPath(savedPath);const {data}=await supabase.storage.from('avatars').createSignedUrl(savedPath,3600);if(data?.signedUrl)setAvatar(data.signedUrl);}
    toast('Profile saved and synced');
   }catch(e:any){toast(e?.message||'Could not sync your profile');return;}
  }else toast('Profile saved on this device');
  setProfileEdit(false);
 };
 const toggleTaskReminder=async(task:PersonalTask,value:boolean)=>{
  if(!supabase||!userId)return;
  const updated={...task,reminder_enabled:value,reminder_time:value?(task.reminder_time||'20:00'):task.reminder_time};
  const {error}=await supabase.from('personal_tasks').update({reminder_enabled:updated.reminder_enabled,reminder_time:updated.reminder_enabled?updated.reminder_time+((updated.reminder_time||'').length===5?':00':''):null}).eq('id',task.id).eq('user_id',userId);
  if(error){toast(error.message);return;}
  setTasks(old=>old.map(t=>t.id===task.id?updated:t));await syncTaskReminder(updated);
  toast(value?'Reminder enabled for '+task.title:'Reminder turned off');
 };
 const toggleReminder=async(value:boolean)=>{setReminder(value);if(value){const p=await Notifications.requestPermissionsAsync();if(!p.granted){setReminder(false);return toast('Notification permission not granted');}if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('sonium-reminders',{name:'Daily reminders',importance:Notifications.AndroidImportance.DEFAULT});await Notifications.cancelAllScheduledNotificationsAsync();await Notifications.scheduleNotificationAsync({content:{title:'SONIUM · Daily check-in',body:'Your daily challenge is waiting. Make today count.'},trigger:{type:Notifications.SchedulableTriggerInputTypes.DAILY,hour:20,minute:0,channelId:'sonium-reminders'}});toast('Daily reminder set for 8:00 PM');}else{await Notifications.cancelAllScheduledNotificationsAsync();toast('Reminder off');}};
 const leaveCrew=()=>Alert.alert('Leave crew?','You can join again with an invite code.',[{text:'Cancel',style:'cancel'},{text:'Leave',style:'destructive',onPress:async()=>{if(supabase&&userId&&crew){const {error}=await supabase.from('crew_members').delete().match({crew_id:crew.id,user_id:userId});if(error)toast(error.message);else{setActiveCrewId(null);setCrew(null);await loadCrew();}}}}]);
 const saveCrew=async(patch:Record<string,any>)=>{if(!supabase||!crew)return;const {error}=await supabase.from('crews').update(patch).eq('id',crew.id);if(error)toast(error.message);else{setCrew({...crew,...patch});setCrews(old=>old.map(c=>c.id===crew.id?{...c,...patch}:c));toast('Crew settings saved');}};
 const adminSetBan=async(id:string,banned:boolean)=>{if(!supabase)return;const {error}=await supabase.rpc('admin_set_banned',{p_user_id:id,p_banned:banned});if(error)toast(error.message);else{setAdminProfiles(old=>old.map(p=>p.id===id?{...p,banned}:p));toast(banned?'Account banned':'Ban removed');}};
 const adminSetReport=async(id:number,status:string)=>{if(!supabase)return;const {error}=await supabase.rpc('admin_update_report',{p_report_id:id,p_status:status});if(error)toast(error.message);else{setAdminReports(old=>old.map(r=>r.id===id?{...r,status}:r));toast('Report updated');}};
 const adminDeleteMessage=async(id:number)=>{if(!supabase)return;const {error}=await supabase.rpc('admin_delete_message',{p_message_id:id});if(error)toast(error.message);else{setAdminMessages(old=>old.filter(m=>m.id!==id));toast('Message removed');}};
 const adminRemoveMember=async(crewId:string,memberId:string)=>{if(!supabase)return;const {error}=await supabase.rpc('admin_remove_crew_member',{p_crew_id:crewId,p_user_id:memberId});if(error)toast(error.message);else{setAdminCrews(old=>old.map(c=>c.id===crewId?{...c,members:c.members.filter((m:any)=>m.user_id!==memberId)}:c));toast('Member removed');}};
 const adminDeleteCrew=async(crewId:string)=>Alert.alert('Delete crew?','This removes the crew and its challenge data.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{if(!supabase)return;const {error}=await supabase.rpc('admin_delete_crew',{p_crew_id:crewId});if(error)toast(error.message);else{setAdminCrews(old=>old.filter(c=>c.id!==crewId));toast('Crew deleted');}}}]);
 const submitReport=async()=>{if(!supabase||!userId||!crew||!reportUser)return;const {data,error}=await supabase.from('reports').insert({reporter_id:userId,reported_id:reportUser,crew_id:crew.id,reason:reportReason,note:reportNote.trim()||null}).select('id').single();if(error){toast(error.message);return;}const result=await supabase.functions.invoke('notify-report',{body:{report_id:data.id}});toast(result.error?'Report saved; email alert is not configured yet':'Report sent for review');setModal(null);setReportUser('');setReportNote('');};
 const createSharedTask=async()=>{if(!newSharedTask.trim()||!supabase||!userId||!crew)return;const {error}=await supabase.from('shared_tasks').insert({crew_id:crew.id,title:newSharedTask.trim().slice(0,40),points:20,created_by:userId});if(error)toast(error.message);else{setNewSharedTask('');await loadCrew();toast('Crew task added');}};
 const submitProof=async(taskId:string)=>{if(!supabase||!userId||!crew)return;const p=await ImagePicker.requestCameraPermissionsAsync();if(!p.granted)return toast('Camera permission is needed');const picked=await ImagePicker.launchCameraAsync({mediaTypes:['images'],allowsEditing:true,quality:.8});if(picked.canceled)return;try{const asset=picked.assets[0];const ext=asset.mimeType?.includes('png')?'png':'jpg';const path=crew.id+'/'+userId+'/'+Date.now()+'.'+ext;const blob=await(await fetch(asset.uri)).blob();const {error:uploadError}=await supabase.storage.from('proofs').upload(path,blob,{contentType:asset.mimeType||'image/jpeg',upsert:false});if(uploadError)throw uploadError;const {error}=await supabase.from('shared_proofs').insert({shared_task_id:taskId,crew_id:crew.id,user_id:userId,photo_path:path});if(error)throw error;await loadCrew();toast('Proof submitted · +20 points');}catch(e:any){toast(e?.message||'Could not upload proof');}};
 const saveAccount=async()=>{if(!supabase||!email.includes('@')||password.length<8)return toast('Enter a valid email and password (8+ characters)');const {data,error}=await supabase.auth.updateUser({email:email.trim(),password});if(error)toast(error.message);else{setAccountEmail(data.user?.email||email.trim());setPassword('');toast('Account link requested · confirm the email in your inbox');}};
 const signIn=async()=>{if(!supabase||!email.includes('@')||!password)return;const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)toast(error.message);else{setUserId(data.user.id);setAccountEmail(data.user.email||email.trim());const {data:p}=await supabase.from('profiles').select('name,avatar_path').eq('id',data.user.id).maybeSingle();if(p?.name)setName(p.name);if(p?.avatar_path){setAvatarPath(p.avatar_path);const {data:a}=await supabase.storage.from('avatars').createSignedUrl(p.avatar_path,3600);if(a?.signedUrl)setAvatar(a.signedUrl);}setModal(null);setPassword('');toast('Account restored and synced');}};
 const Card=({children,style}:any)=><View style={[styles.card,{backgroundColor:C.card,borderColor:C.line},style]}>{children}</View>;
 const Section=({title,right,onRight}:any)=><View style={styles.section}><Text style={[styles.sectionTitle,{color:C.fg}]}>{title}</Text>{right&&<TouchableOpacity onPress={onRight}><Text style={{color:C.accent,fontWeight:'800'}}>{right}</Text></TouchableOpacity>}</View>;
 const TaskRow=({task}: {task:PersonalTask})=>{
  const checked=done.includes(task.id);const stepsDone=(task.subtasks||[]).filter((_,i)=>subtaskDone.includes(task.id+':sub:'+i)).length;const hasSteps=(task.subtasks||[]).length>0;
  return <Pressable onPress={()=>{if(hasSteps){setActiveTask(task);setShowPrayers(true);}else toggleTask(task.id);}} onLongPress={()=>openTaskEditor(task)} delayLongPress={450} style={[styles.task,{backgroundColor:C.card,borderColor:C.line}]}>
   <View style={[styles.check,{borderColor:checked?C.accent:C.muted,backgroundColor:checked?C.accent:'transparent'}]}>{checked&&<Ionicons name="checkmark" size={16} color={C.accentInk}/>}</View>
   <View style={{flex:1}}><Text style={{color:checked?C.muted:C.fg,fontWeight:'800',textDecorationLine:checked?'line-through':'none'}}>{task.title}</Text><Text style={{color:C.muted,fontSize:10,marginTop:3}}>{hasSteps?stepsDone+'/'+task.subtasks.length+' steps · Hold to edit':'Tap to complete · Hold to edit'}</Text></View>
   <Text style={{color:C.accent,fontWeight:'900'}}>+{task.points}</Text><Ionicons name="chevron-forward" size={16} color={C.muted}/>
  </Pressable>;
 };
 const header=(kicker:string,title:string,accent:string)=><><Text style={{color:C.muted,fontSize:11,fontWeight:'800',letterSpacing:1.5,marginBottom:6}}>{kicker.toUpperCase()}</Text><Text style={{color:C.fg,fontSize:30,fontWeight:'900'}}>{title}<Text style={{color:C.accent,fontStyle:'italic'}}> {accent}</Text></Text></>;
 const brandHeader=(subtitle:string)=><View style={[styles.top,{marginBottom:20}]}><View style={styles.brand}><View style={[styles.logo,{backgroundColor:C.accent}]}><Text style={{color:C.accentInk,fontSize:22,fontWeight:'900'}}>S.</Text></View><View><Text style={{color:C.fg,fontSize:20,fontWeight:'900',letterSpacing:1}}>SONIUM</Text><Text style={{color:C.muted,fontSize:10}}>{subtitle}</Text></View></View><TouchableOpacity onPress={()=>setTab('Settings')} style={[styles.avatar,{backgroundColor:C.card2,borderColor:C.line,width:44,height:44}]}>{avatar?<Image source={{uri:avatar}} style={{width:42,height:42,borderRadius:22}}/>:<Ionicons name="person" size={21} color={C.fg}/>}</TouchableOpacity></View>;
 const Home=()=><>
  {brandHeader('YOUR 14-DAY CHALLENGE')}
  <View style={{marginBottom:18}}>{header('One day at a time','Make it','count.')}<Text style={{color:C.muted,marginTop:7,fontSize:14}}>Your goals. Your pace. Your challenge.</Text></View>
  <Card style={{padding:17,marginBottom:22}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><View><Text style={styles.eyebrow}>CHALLENGE PROGRESS</Text><Text style={{color:C.fg,fontSize:25,fontWeight:'900',marginTop:5}}>Day {day} <Text style={{color:C.muted,fontSize:15,fontWeight:'600'}}>of {crew?.days||14}</Text></Text><Text style={{color:C.muted,fontSize:11,marginTop:3}}>{dayProgress.slice(Math.max(0,currentDay-7),currentDay).filter(n=>n>0).length}/7 active days this week</Text></View><View style={[styles.ring,{width:72,height:72,borderRadius:38,borderColor:C.accent,borderWidth:6}]}><Text style={{color:C.fg,fontSize:16,fontWeight:'900'}}>{Math.round((day/(crew?.days||14))*100)}%</Text></View></View>
   <Pressable onPressIn={()=>setProgressPeek(true)} onPressOut={()=>setProgressPeek(false)} onLongPress={()=>setShowDays(true)} delayLongPress={350} style={{marginTop:17}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:7}}><Text style={{color:C.fg,fontSize:12,fontWeight:'800'}}>Hold to preview all days</Text><TouchableOpacity onPress={()=>setShowDays(true)}><Text style={{color:C.accent,fontSize:12,fontWeight:'900'}}>See all days →</Text></TouchableOpacity></View>
    <View style={[styles.track,{height:10,backgroundColor:C.card2}]}><View style={[styles.fill,{height:10,width:(Math.round((day/(crew?.days||14))*100)+'%') as `${number}%`,backgroundColor:C.accent}]}/></View>
   </Pressable>
   <Animated.View style={{height:progressAnim.interpolate({inputRange:[0,1],outputRange:[0,68]}),opacity:progressAnim,overflow:'hidden'}}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{alignItems:'center',paddingTop:11,gap:7}}>
    {Array.from({length:crew?.days||14},(_,i)=>i+1).map(d=><View key={d} style={{width:37,height:43,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:d===day?C.accent:C.card2}}><Text style={{color:d===day?C.accentInk:C.fg,fontWeight:'900'}}>{d}</Text><View style={{width:5,height:5,borderRadius:3,marginTop:3,backgroundColor:(dayProgress[d-1]||0)>0?(d===day?C.accentInk:C.accent):C.muted}}/></View>)}
   </ScrollView></Animated.View>
  </Card>
  <Section title="Your personal tasks" right="See all" onRight={()=>setShowDays(true)}/>
  {tasks.length===0?<Card style={{alignItems:'center',padding:22}}>
   <Ionicons name="list-circle-outline" size={42} color={C.accent}/><Text style={{color:C.fg,fontSize:17,fontWeight:'900',marginTop:9}}>Build your own routine</Text>
   <Text style={{color:C.muted,fontSize:12,textAlign:'center',lineHeight:19,marginTop:6}}>These are your tasks only. Add the habits you want to complete every day.</Text>
   <TouchableOpacity style={[styles.cta,{backgroundColor:C.accent,width:'100%'}]} onPress={()=>openTaskEditor()}><Text style={{color:C.accentInk,fontWeight:'900'}}>+ Create my first task</Text></TouchableOpacity>
   <Text style={{color:C.muted,fontSize:10,marginTop:13}}>QUICK START IDEAS</Text><View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:7,marginTop:8}}>
    {TASK_SUGGESTIONS.map((s:any)=><TouchableOpacity key={s.title} onPress={()=>{setActiveTask(null);setTaskTitle(s.title);setTaskDetails('');setTaskPoints(String(s.points));setTaskIcon(s.icon);setTaskSubtasks(s.subtasks.join('\n'));setTaskReminder(false);setTaskReminderTime('20:00');setModal('task');}} style={[styles.smallBtn,{backgroundColor:C.card2}]}><Text style={{color:C.fg,fontSize:11,fontWeight:'800'}}>{s.title}</Text></TouchableOpacity>)}
   </View>
  </Card>:<>
   {tasks.slice(0,4).map(t=><TaskRow key={t.id} task={t}/>)}
   <TouchableOpacity onPress={()=>openTaskEditor()} style={[styles.task,{borderStyle:'dashed',borderColor:C.accent,backgroundColor:'transparent',justifyContent:'center'}]}><Ionicons name="add-circle-outline" size={21} color={C.accent}/><Text style={{color:C.accent,fontWeight:'900'}}>Add a personal task</Text></TouchableOpacity>
   {tasks.length>4&&<TouchableOpacity onPress={()=>setShowDays(true)} style={{alignItems:'center',padding:8}}><Text style={{color:C.accent,fontWeight:'900'}}>See all {tasks.length} tasks →</Text></TouchableOpacity>}
  </>}
  <TouchableOpacity style={[styles.cta,{backgroundColor:C.accent,marginTop:18}]} onPress={()=>setTab('Stats')}><Text style={{color:C.accentInk,fontWeight:'900'}}>Keep Going · View your stats →</Text></TouchableOpacity>
  {!challengeActive&&<Text style={{color:C.muted,fontSize:11,textAlign:'center',marginTop:12}}>This challenge period has ended. Your history is still available in Stats.</Text>}
 </>;
 const Stats=()=><>
  {brandHeader('YOUR PROGRESS')}{header('Your stats','Built by','consistency.')}<Text style={{color:C.muted,marginTop:7,marginBottom:18}}>Track your progress, keep going!</Text>
  <View style={styles.tiles}>
   {[
    {v:completed+'/'+tasks.length,l:'Tasks done',icon:'checkmark-circle',color:C.accent,action:()=>setTab('Home')},
    {v:String(streak),l:'Day streak',icon:'flame',color:C.flame,action:()=>setShowDays(true)},
    {v:String(members.length),l:'Crew members',icon:'people',color:'#AAB7D6',action:()=>setTab('Crew')},
    {v:String(totalEarned),l:'Total points',icon:'trophy',color:'#F4C84A',action:()=>setTab('Crew')}
   ].map((x:any)=><TouchableOpacity key={x.l} onPress={x.action} style={[styles.card,styles.statTile,{backgroundColor:C.card,borderColor:C.line,minHeight:98}]}><View style={{flexDirection:'row',alignItems:'center',gap:10}}><Ionicons name={x.icon as any} size={27} color={x.color}/><View style={{flex:1}}><Text style={{color:C.fg,fontSize:24,fontWeight:'900'}}>{x.v}</Text><Text style={{color:C.muted,fontSize:11}}>{x.l}</Text></View><Ionicons name="chevron-forward" size={15} color={C.muted}/></View></TouchableOpacity>)}
  </View>
  <Section title="Challenge progress" right="14-day view" onRight={()=>setShowDays(true)}/>
  <Card style={{padding:17}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{color:C.fg,fontWeight:'900',fontSize:16}}>Your challenge</Text><Text style={{color:C.muted,fontSize:12}}>Day <Text style={{color:C.accent,fontWeight:'900'}}>{currentDay}</Text> of {crew?.days||14}</Text></View>
   <View style={{flexDirection:'row',alignItems:'center',gap:18,marginTop:14}}><View style={{width:112,height:112,borderRadius:60,borderWidth:10,borderColor:C.accent,alignItems:'center',justifyContent:'center',backgroundColor:C.card2}}><Text style={{color:C.fg,fontSize:25,fontWeight:'900'}}>{Math.round((currentDay/(crew?.days||14))*100)}%</Text><Text style={{color:C.muted,fontSize:9}}>TIME ELAPSED</Text></View><View style={{flex:1}}><Text style={{color:C.fg,fontWeight:'900',fontSize:16}}>{daysLeft>0?daysLeft+' days left':'Challenge complete'}</Text><Text style={{color:C.muted,fontSize:12,lineHeight:18,marginTop:5}}>You have completed {completed} of your {tasks.length} personal tasks today.</Text><TouchableOpacity onPress={()=>setTab('Home')} style={{marginTop:10}}><Text style={{color:C.accent,fontWeight:'900'}}>Go to today's tasks →</Text></TouchableOpacity></View></View>
   <View style={[styles.track,{height:9,backgroundColor:C.card2,marginTop:17}]}><View style={[styles.fill,{height:9,width:(Math.round((currentDay/(crew?.days||14))*100)+'%') as `${number}%`,backgroundColor:C.accent}]}/></View>
  </Card>
  <Section title="Your performance" right="This week"/>
  <Card style={{padding:16}}><View style={{height:148,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-around'}}>
   {weeklyPoints.map((v,i)=>{const max=Math.max(10,...weeklyPoints);return <View key={i} style={{alignItems:'center',height:'100%',justifyContent:'flex-end',flex:1,gap:7}}><View style={{width:24,height:Math.max(7,Math.round((v/max)*104)),backgroundColor:C.accent,borderRadius:7,opacity:v?1:.22}}/><Text style={{color:C.muted,fontSize:10}}>{weekLabels[i]}</Text></View>;})}
  </View><Text style={{color:C.muted,fontSize:11,marginTop:12}}>{weekPoints} points earned this week from completed tasks.</Text></Card>
  <Section title="Quick insights"/><View style={{flexDirection:'row',gap:8}}>
   {[{icon:'flash',v:String(weekPoints),l:'Weekly points',color:'#F4C84A'},{icon:'medal',v:myRank?('#'+myRank):'—',l:'Crew rank',color:C.accent},{icon:'calendar',v:String(daysLeft),l:'Days remaining',color:'#AAB7D6'}].map((x:any)=><View key={x.l} style={[styles.card,{flex:1,backgroundColor:C.card,borderColor:C.line,padding:12}]}><Ionicons name={x.icon as any} size={22} color={x.color}/><Text style={{color:C.fg,fontWeight:'900',fontSize:18,marginTop:8}}>{x.v}</Text><Text style={{color:C.muted,fontSize:10}}>{x.l}</Text></View>)}
  </View>
  <TouchableOpacity onPress={()=>setTab('Crew')} style={[styles.cta,{backgroundColor:C.card2}]}><Text style={{color:C.fg,fontWeight:'900'}}>Open your crew →</Text></TouchableOpacity>
 </>;
 const CrewView=()=><>
  {brandHeader('YOUR PEOPLE')}
  <View style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:17}}><Ionicons name="people" color={C.accent} size={34}/><View style={{flex:1}}>{header('Stronger together','Your','Crew.')}<Text style={{color:C.muted,fontSize:13,marginTop:4}}>Build good habits with your people.</Text></View></View>
  {crew?<>
   <Card style={{padding:17,marginBottom:15}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><View style={{flex:1}}><Text style={styles.eyebrow}>ACTIVE CREW</Text><Text style={{color:C.fg,fontSize:21,fontWeight:'900',marginTop:5}}>{crew.name}</Text><Text style={{color:C.muted,fontSize:11,marginTop:3}}>Invite code · {crew.invite_code}</Text></View><TouchableOpacity onPress={()=>Share.share({message:'Join my SONIUM crew: '+Linking.createURL('join',{queryParams:{code:crew.invite_code}})+'\nInvite code: '+crew.invite_code})} style={[styles.smallBtn,{backgroundColor:C.card2}]}><Ionicons name="share-social-outline" size={20} color={C.accent}/></TouchableOpacity></View>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:17}}><Text style={{color:C.fg,fontWeight:'900'}}>Members · {members.length}</Text><TouchableOpacity onPress={()=>Share.share({message:'Join my SONIUM crew. Invite code: '+crew.invite_code})}><Text style={{color:C.accent,fontWeight:'900',fontSize:12}}>Invite friends +</Text></TouchableOpacity></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:17,paddingTop:13,paddingBottom:4}}>
     {members.map(m=><View key={m.user_id} style={{alignItems:'center',width:61}}><View style={[styles.memberAvatar,{width:48,height:48,borderRadius:25,backgroundColor:C.card2,borderWidth:m.user_id===userId?2:1,borderColor:m.user_id===userId?C.accent:C.line,overflow:'hidden'}]}>{m.avatar_url?<Image source={{uri:m.avatar_url}} style={{width:46,height:46,borderRadius:23}}/>:<Text style={{color:C.fg,fontSize:17,fontWeight:'900'}}>{m.name.slice(0,1).toUpperCase()}</Text>}</View><Text numberOfLines={1} style={{color:m.user_id===userId?C.accent:C.fg,fontSize:10,fontWeight:'800',marginTop:6}}>{m.user_id===userId?'You':m.name}</Text>{m.user_id!==userId&&<TouchableOpacity onPress={()=>{setReportUser(m.user_id);setModal('report');}}><Text style={{color:C.muted,fontSize:9,marginTop:3}}>Report</Text></TouchableOpacity>}</View>)}
     <TouchableOpacity onPress={()=>Share.share({message:'Join my SONIUM crew. Invite code: '+crew.invite_code})} style={{alignItems:'center',width:61}}><View style={{width:48,height:48,borderRadius:25,borderWidth:1,borderStyle:'dashed',borderColor:C.muted,alignItems:'center',justifyContent:'center'}}><Ionicons name="add" size={25} color={C.accent}/></View><Text style={{color:C.muted,fontSize:10,marginTop:6}}>Invite</Text></TouchableOpacity>
    </ScrollView>
    <View style={{flexDirection:'row',gap:7,marginTop:9}}><TextInput value={rename} onChangeText={setRename} placeholder="Rename crew" placeholderTextColor={C.muted} style={[styles.input,{flex:1,color:C.fg,borderColor:C.line,backgroundColor:C.card2}]}/><TouchableOpacity onPress={()=>{if(rename.trim()){saveCrew({name:rename.trim().slice(0,28)});setRename('');}}} style={[styles.smallBtn,{backgroundColor:C.accent,justifyContent:'center'}]}><Text style={{color:C.accentInk,fontWeight:'900'}}>Save</Text></TouchableOpacity></View>
   </Card>
   <Card style={{padding:17,marginBottom:15}}>
    <View style={{flexDirection:'row',gap:10}}>
     <View style={{flex:1,borderRightWidth:1,borderRightColor:C.line,paddingRight:9}}><View style={{flexDirection:'row',alignItems:'center',gap:6}}><Ionicons name="star" color="#F4C84A" size={19}/><Text style={{color:C.muted,fontSize:11,fontWeight:'800'}}>CREW POINTS</Text></View><Text style={{color:C.fg,fontSize:27,fontWeight:'900',marginTop:6}}>{crewPoints.toLocaleString()}</Text></View>
     <View style={{flex:1,paddingLeft:8}}><View style={{flexDirection:'row',alignItems:'center',gap:6}}><Ionicons name="trophy" color="#F4C84A" size={19}/><Text style={{color:C.muted,fontSize:11,fontWeight:'800'}}>YOUR RANK</Text></View><Text style={{color:C.fg,fontSize:27,fontWeight:'900',marginTop:6}}>{myRank?'#'+myRank:'—'}</Text><Text style={{color:C.muted,fontSize:10}}>in this crew</Text></View>
    </View>
    <View style={styles.settingLine}/>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{color:C.fg,fontWeight:'900'}}>Crew challenge progress</Text><Text style={{color:C.accent,fontWeight:'900'}}>{Math.round(currentDay/(crew.days||14)*100)}%</Text></View>
    <View style={[styles.track,{height:9,backgroundColor:C.card2,marginTop:9}]}><View style={[styles.fill,{height:9,width:(Math.round(currentDay/(crew.days||14)*100)+'%') as `${number}%`,backgroundColor:C.accent}]}/></View>
    <Text style={{color:C.muted,fontSize:11,marginTop:8}}>{daysLeft} days left in the challenge</Text>
   </Card>
   <Section title="Crew leaderboard"/>
   <Card>{board.length?board.map((p,i)=><View key={p.user_id} style={{flexDirection:'row',paddingVertical:9,gap:10,alignItems:'center',borderBottomWidth:i===board.length-1?0:1,borderBottomColor:C.line}}><Text style={{color:C.accent,fontWeight:'900',width:22}}>#{i+1}</Text><Text style={{color:C.fg,flex:1,fontWeight:p.user_id===userId?'900':'600'}}>{p.name}{p.user_id===userId?' · You':''}</Text><Text style={{color:C.accent,fontWeight:'900'}}>{Number(p.points||0).toLocaleString()} pts</Text></View>):<Text style={{color:C.muted}}>Points appear here after tasks are completed.</Text>}</Card>
   <Section title="Crew activity"/>
   <Card>{messages.slice(-3).reverse().map(m=><View key={String(m.id)} style={{paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.line}}><Text style={{color:C.fg,fontSize:12}}><Text style={{fontWeight:'900'}}>{m.user_id===userId?'You':members.find(x=>x.user_id===m.user_id)?.name||'Member'}</Text> {m.body||m.sticker}</Text><Text style={{color:C.muted,fontSize:9,marginTop:3}}>{new Date(m.created_at).toLocaleString()}</Text></View>)}{messages.length===0&&<Text style={{color:C.muted,fontSize:12}}>Your crew activity will show here.</Text>}</Card>
   <Section title="Shared crew tasks"/>
   <Card style={{padding:15}}>
    <Text style={{color:C.muted,fontSize:11,lineHeight:17}}>These tasks are shared by the whole crew. Each member submits a photo, then other members review whether the proof is valid.</Text>
    <TextInput value={newSharedTask} onChangeText={setNewSharedTask} maxLength={40} placeholder="Create a shared task..." placeholderTextColor={C.muted} style={[styles.input,{color:C.fg,backgroundColor:C.card2,borderColor:C.line,marginTop:12}]}/>
    <TouchableOpacity onPress={createSharedTask} style={[styles.smallBtn,{backgroundColor:C.accent,marginTop:8,alignItems:'center'}]}><Text style={{color:C.accentInk,fontWeight:'900'}}>+ Add shared task · 20 pts</Text></TouchableOpacity>
    {sharedTasks.map(t=><View key={t.id} style={{paddingVertical:13,borderBottomWidth:1,borderBottomColor:C.line}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={{color:C.fg,fontWeight:'900',flex:1}}>{t.title}</Text><Text style={{color:C.accent,fontWeight:'900'}}>+{t.points} pts</Text></View>
     <Text style={{color:C.muted,fontSize:10,marginTop:4}}>{(t.shared_proofs||[]).length} member proofs submitted</Text>
     {(t.shared_proofs||[]).map((p:any)=>{
      const reviews=p.reviews||[];const yes=reviews.filter((v:any)=>v.approved).length;const no=reviews.filter((v:any)=>!v.approved).length;const myVote=reviews.find((v:any)=>v.reviewer_id===userId);
      return <View key={p.id} style={{marginTop:11,padding:10,borderRadius:14,backgroundColor:C.card2}}>
       <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{color:C.fg,fontSize:11,fontWeight:'900'}}>{members.find(m=>m.user_id===p.user_id)?.name||'Crew member'}'s proof</Text><Text style={{color:C.muted,fontSize:9}}>{new Date(p.created_at||Date.now()).toLocaleDateString()}</Text></View>
       {p.signedUrl&&<Image source={{uri:p.signedUrl}} style={{width:'100%',height:190,borderRadius:10,marginTop:8}} resizeMode="cover"/>}
       <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:8}}><Text style={{color:C.accent,fontSize:10,fontWeight:'800'}}>✓ {yes} approve</Text><Text style={{color:C.flame,fontSize:10,fontWeight:'800'}}>✕ {no} reject</Text></View>
       {p.user_id!==userId?<View style={{flexDirection:'row',gap:8,marginTop:8}}>
        <TouchableOpacity disabled={proofReviewBusy===p.id} onPress={()=>voteProof(p.id,crew.id,true)} style={[styles.smallBtn,{backgroundColor:C.accent,flex:1,alignItems:'center'}]}><Text style={{color:C.accentInk,fontWeight:'900',fontSize:11}}>{myVote?.approved?'✓ Approved':'Looks correct'}</Text></TouchableOpacity>
        <TouchableOpacity disabled={proofReviewBusy===p.id} onPress={()=>voteProof(p.id,crew.id,false)} style={[styles.smallBtn,{backgroundColor:C.bg,flex:1,alignItems:'center'}]}><Text style={{color:C.fg,fontWeight:'900',fontSize:11}}>{myVote&&!myVote.approved?'✓ Needs redo':'Not correct'}</Text></TouchableOpacity>
       </View>:<Text style={{color:C.muted,fontSize:10,marginTop:7}}>Your proof · other crew members can review it.</Text>}
      </View>;
     })}
     {!(t.shared_proofs||[]).some((p:any)=>p.user_id===userId)&&<TouchableOpacity onPress={()=>submitProof(t.id)} style={[styles.smallBtn,{backgroundColor:C.accent,alignSelf:'flex-start',marginTop:9}]}><Text style={{color:C.accentInk,fontWeight:'900'}}>Take photo proof →</Text></TouchableOpacity>}
    </View>)}
    {sharedTasks.length===0&&<Text style={{color:C.muted,fontSize:12,textAlign:'center',padding:12}}>No shared tasks yet. Add the first crew challenge above.</Text>}
   </Card>
   <Section title="Weekly verdict"/>
   <Card><Text style={{color:C.fg,fontWeight:'800'}}>Choose the crew penalty</Text><View style={{flexDirection:'row',gap:7,marginTop:10}}>{(['treat','judge','custom'] as const).map(v=><TouchableOpacity key={v} onPress={()=>saveCrew({penalty:v})} style={[styles.themeChoice,{backgroundColor:crew.penalty===v?C.accent:C.card2}]}><Text style={{color:crew.penalty===v?C.accentInk:C.fg,fontWeight:'800'}}>{v}</Text></TouchableOpacity>)}</View>{crew.penalty==='custom'&&<View style={{flexDirection:'row',gap:7,marginTop:9}}><TextInput value={penaltyCustom} onChangeText={setPenaltyCustom} placeholder={crew.penalty_custom||'Custom penalty'} placeholderTextColor={C.muted} style={[styles.input,{flex:1,color:C.fg,backgroundColor:C.card2,borderColor:C.line}]}/><TouchableOpacity onPress={()=>saveCrew({penalty_custom:penaltyCustom.trim()})} style={[styles.smallBtn,{backgroundColor:C.accent}]}><Text style={{color:C.accentInk}}>Save</Text></TouchableOpacity></View>}</Card>
   <Section title="Crew chat" right="Privacy" onRight={()=>setModal('privacy')}/>
   <Card><View style={{height:220}}><ScrollView contentContainerStyle={{gap:9}}>{messages.map(m=><View key={String(m.id)} style={{alignSelf:m.user_id===userId?'flex-end':'flex-start',maxWidth:'85%'}}><Text style={{color:C.muted,fontSize:10}}>{m.user_id===userId?'You':members.find(x=>x.user_id===m.user_id)?.name||'Member'}</Text><View style={{backgroundColor:m.user_id===userId?C.accent:C.card2,borderRadius:13,padding:9}}>{m.body&&<Text style={{color:m.user_id===userId?C.accentInk:C.fg}}>{m.body}</Text>}{m.sticker&&<Text style={{fontSize:26}}>{m.sticker}</Text>}</View></View>)}</ScrollView></View>
    <View style={{flexDirection:'row',gap:7,marginTop:10}}><TextInput value={message} onChangeText={setMessage} placeholder="Write a message..." placeholderTextColor={C.muted} style={[styles.input,{flex:1,color:C.fg,backgroundColor:C.card2,borderColor:C.line}]} onSubmitEditing={()=>sendMessage(message)}/><TouchableOpacity onPress={()=>sendMessage(message)} style={[styles.send,{backgroundColor:C.accent}]}><Ionicons name="send" color={C.accentInk}/></TouchableOpacity></View>
    <View style={{flexDirection:'row',justifyContent:'space-around',marginTop:9}}>{STICKERS.map(s=><TouchableOpacity key={s} onPress={()=>sendMessage('',s)}><Text style={{fontSize:21}}>{s}</Text></TouchableOpacity>)}</View>
   </Card>
   <TouchableOpacity onPress={leaveCrew} style={[styles.smallBtn,{backgroundColor:C.card2,alignSelf:'center',marginTop:18}]}><Text style={{color:C.muted,fontWeight:'800'}}>Leave this crew</Text></TouchableOpacity>
  </>:<Card style={{marginTop:20,alignItems:'center',padding:22}}>
   <Ionicons name="people-outline" size={38} color={C.accent}/><Text style={{color:C.fg,fontSize:18,fontWeight:'900',marginTop:10}}>No crew yet</Text><Text style={{color:C.muted,textAlign:'center',fontSize:12,marginTop:6}}>Create a crew or join your friends with an invite code.</Text>
   <TouchableOpacity style={[styles.cta,{backgroundColor:C.accent,width:'100%'}]} onPress={()=>setModal('create')}><Text style={{color:C.accentInk,fontWeight:'900'}}>Create a crew</Text></TouchableOpacity>
   <TouchableOpacity style={[styles.smallBtn,{backgroundColor:C.card2,marginTop:9,width:'100%',alignItems:'center'}]} onPress={()=>setModal('join')}><Text style={{color:C.fg,fontWeight:'800'}}>Join with invite code</Text></TouchableOpacity>
  </Card>}
 </>;
 const Settings=()=><>
  {brandHeader('YOUR ACCOUNT')}
  {header('Make it yours','Your','SONIUM.')}
  <Card style={{marginTop:18,padding:16}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:13}}>
    <TouchableOpacity onPress={pickAvatar} style={[styles.avatar,{width:66,height:66,borderRadius:34,backgroundColor:C.card2,borderColor:C.accent,overflow:'hidden'}]}>{avatar?<Image source={{uri:avatar}} style={{width:64,height:64,borderRadius:32}}/>:<Ionicons name="person" size={28} color={C.fg}/>}</TouchableOpacity>
    <View style={{flex:1}}><Text style={{color:C.fg,fontSize:18,fontWeight:'900'}}>{name}</Text><Text style={{color:C.muted,fontSize:10,marginTop:3}}>{online?'Profile synced with Supabase':'Local profile · not synced'}</Text><TouchableOpacity onPress={()=>{setProfileEdit(true);}} style={{marginTop:5}}><Text style={{color:C.accent,fontSize:11,fontWeight:'900'}}>Edit profile · Change photo</Text></TouchableOpacity></View>
    <Ionicons name="create-outline" color={C.accent} size={22}/>
   </View>
   {profileEdit&&<><TextInput value={name} onChangeText={setName} maxLength={24} placeholder="Your display name" placeholderTextColor={C.muted} style={[styles.input,{color:C.fg,backgroundColor:C.card2,borderColor:C.line,marginTop:13}]}/><View style={{flexDirection:'row',gap:8}}><TouchableOpacity style={[styles.smallBtn,{backgroundColor:C.card2,marginTop:8,flex:1,alignItems:'center'}]} onPress={pickAvatar}><Text style={{color:C.fg,fontWeight:'800'}}>Choose photo</Text></TouchableOpacity><TouchableOpacity style={[styles.smallBtn,{backgroundColor:C.accent,marginTop:8,flex:1,alignItems:'center'}]} onPress={saveProfile}><Text style={{color:C.accentInk,fontWeight:'900'}}>Save profile</Text></TouchableOpacity></View></>}
  </Card>
  <Section title="Account & recovery"/>
  <Card style={{padding:16}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Ionicons name="shield-checkmark" size={21} color={accountEmail?C.accent:C.muted}/><Text style={{color:C.fg,fontWeight:'900'}}>{accountEmail||'Anonymous account'}</Text></View>
   <Text style={{color:C.muted,fontSize:11,lineHeight:18,marginTop:6}}>{accountEmail?'Your email account is linked to this SONIUM profile. Keep your password safe to restore it on another phone.':'Your progress is currently tied to this device session. Link an email and password to restore it if you change phones.'}</Text>
   <TouchableOpacity onPress={()=>setModal('account')} style={[styles.smallBtn,{backgroundColor:C.accent,alignSelf:'flex-start',marginTop:11}]}><Text style={{color:C.accentInk,fontWeight:'900'}}>{accountEmail?'Update account details':'Link email & password'}</Text></TouchableOpacity>
  </Card>
  <Section title="Your personal tasks" right="Add task +" onRight={()=>openTaskEditor()}/>
  <Card style={{padding:14}}>
   {tasks.length===0?<Text style={{color:C.muted,fontSize:12}}>No personal tasks yet. Create your first one from Home.</Text>:tasks.map(t=><View key={t.id} style={{paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.line}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
     <Ionicons name={t.icon as any} size={21} color={C.accent}/>
     <View style={{flex:1}}><Text style={{color:C.fg,fontWeight:'800'}}>{t.title}</Text><Text style={{color:C.muted,fontSize:10,marginTop:2}}>{t.points} points · {t.subtasks.length} steps · {t.reminder_enabled?'Reminder '+(t.reminder_time||''):'No reminder'}</Text></View>
     <Switch value={t.reminder_enabled} onValueChange={v=>toggleTaskReminder(t,v)} trackColor={{true:C.accent,false:C.card2}}/>
     <TouchableOpacity onPress={()=>openTaskEditor(t)} style={{padding:5}}><Ionicons name="create-outline" color={C.accent} size={20}/></TouchableOpacity>
    </View>
   </View>)}
  </Card>
  <Section title="Preferences"/>
  <Card style={{padding:16}}>
   <Text style={{color:C.fg,fontWeight:'800'}}>Appearance</Text>
   <View style={{flexDirection:'row',gap:7,marginTop:9}}>{(['dark','light','system'] as ThemeMode[]).map(m=><TouchableOpacity key={m} onPress={()=>setThemeMode(m)} style={[styles.themeChoice,{backgroundColor:themeMode===m?C.accent:C.card2}]}><Text style={{color:themeMode===m?C.accentInk:C.fg,fontWeight:'800'}}>{m}</Text></TouchableOpacity>)}</View>
   <View style={styles.settingLine}/>
   <Text style={{color:C.fg,fontWeight:'800'}}>Task reminder behavior</Text>
   <Text style={{color:C.muted,fontSize:11,lineHeight:17,marginTop:4}}>Each task has its own reminder switch and time. Edit a task to choose a separate time for it.</Text>
   <View style={styles.settingLine}/>
   <Text style={{color:C.fg,fontWeight:'800'}}>Language</Text><Text style={{color:C.muted,fontSize:11,marginTop:3}}>English</Text>
  </Card>
  <Section title="Your crews"/>
  <Card><Text style={{color:C.fg,fontWeight:'800'}}>{crew?.name||'No active crew'}</Text>
   {crews.filter(c=>c.id!==activeCrewId).map(c=><TouchableOpacity key={c.id} onPress={()=>setActiveCrewId(c.id)} style={{paddingVertical:9}}><Text style={{color:C.accent}}>Switch to · {c.name}</Text></TouchableOpacity>)}
   <TouchableOpacity onPress={()=>setModal('join')} style={{marginTop:10}}><Text style={{color:C.accent,fontWeight:'800'}}>Join another crew →</Text></TouchableOpacity>
   <TouchableOpacity onPress={()=>setModal('create')} style={{marginTop:8}}><Text style={{color:C.accent,fontWeight:'800'}}>Create a new crew +</Text></TouchableOpacity>
  </Card>
  <Section title="About"/>
  <Card><Text style={{color:C.fg,fontWeight:'800'}}>SONIUM · Developer: Yassin Mohamed</Text>
   <TouchableOpacity onPress={()=>setModal('privacy')} style={{marginTop:12}}><Text style={{color:C.accent}}>Privacy & moderation</Text></TouchableOpacity>
   <TouchableOpacity onPress={()=>Share.share({message:'SONIUM · Make today count.'})} style={{marginTop:12}}><Text style={{color:C.accent}}>Share SONIUM</Text></TouchableOpacity>
   <TouchableOpacity onPress={()=>require('react-native').Linking.openURL('https://wa.me/201100322517')} style={{marginTop:12}}><Text style={{color:C.accent}}>Help & Support · WhatsApp</Text></TouchableOpacity>
  </Card>
  {isAdmin&&<><Section title="Owner control"/><Card><Text style={{color:C.fg,fontWeight:'900',fontSize:16}}>Moderation dashboard</Text><Text style={{color:C.muted,fontSize:11,marginTop:3}}>{adminReports.length} reports · {adminProfiles.length} profiles</Text>
   {adminReports.slice(0,15).map(r=><View key={r.id} style={{paddingVertical:9,borderBottomWidth:1,borderBottomColor:C.line}}><Text style={{color:C.fg,fontWeight:'800'}}>Report #{r.id} · {r.reason}</Text><Text style={{color:C.muted,fontSize:11}}>{String(r.reported_id).slice(0,10)} · {r.status} · {r.note||'No details'}</Text><View style={{flexDirection:'row',gap:7,marginTop:6}}>{(['reviewing','closed'] as const).map(s=><TouchableOpacity key={s} onPress={()=>adminSetReport(r.id,s)} style={[styles.smallBtn,{backgroundColor:C.card2}]}><Text style={{color:C.fg,fontWeight:'800',fontSize:11}}>{s}</Text></TouchableOpacity>)}</View></View>)}
   <Text style={{color:C.fg,fontWeight:'900',marginTop:12}}>Accounts</Text>
   {adminProfiles.slice(0,30).map(p=><View key={p.id} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:7}}><Text style={{color:C.fg,flex:1}}>{p.name||'Player'} · {String(p.id).slice(0,8)}</Text><TouchableOpacity onPress={()=>adminSetBan(p.id,!p.banned)}><Text style={{color:C.accent,fontWeight:'800'}}>{p.banned?'Unban':'Ban'}</Text></TouchableOpacity></View>)}
   <Text style={{color:C.fg,fontWeight:'900',marginTop:12}}>Recent messages</Text>
   {adminMessages.slice(0,25).map(m=><View key={m.id} style={{paddingVertical:7,borderTopWidth:1,borderTopColor:C.line}}><Text style={{color:C.muted,fontSize:10}}>{String(m.user_id).slice(0,8)} · {String(m.crew_id).slice(0,8)}</Text><Text style={{color:C.fg}}>{m.body||m.sticker}</Text><TouchableOpacity onPress={()=>adminDeleteMessage(m.id)}><Text style={{color:C.flame,fontWeight:'800',fontSize:11,textAlign:'right'}}>Remove message</Text></TouchableOpacity></View>)}
   <Text style={{color:C.fg,fontWeight:'900',marginTop:12}}>Crews</Text>
   {adminCrews.map(room=><View key={room.id} style={{paddingVertical:8,borderTopWidth:1,borderTopColor:C.line}}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{color:C.fg,fontWeight:'800',flex:1}}>{room.name} · {room.members.length} members</Text><TouchableOpacity onPress={()=>adminDeleteCrew(room.id)}><Text style={{color:C.flame,fontWeight:'800'}}>Delete</Text></TouchableOpacity></View>{room.members.map((m:any)=><View key={m.user_id} style={{flexDirection:'row',justifyContent:'space-between',paddingTop:6}}><Text style={{color:C.muted,fontSize:11}}>{String(m.user_id).slice(0,12)}</Text><TouchableOpacity onPress={()=>adminRemoveMember(room.id,m.user_id)}><Text style={{color:C.accent,fontSize:11,fontWeight:'800'}}>Remove</Text></TouchableOpacity></View>)}</View>)}
  </Card></>}
  <Text style={{color:C.muted,fontSize:10,textAlign:'center',marginTop:20}}>SONIUM · VERSION 0.2.0</Text>
 </>;
 const screen=tab==='Home'?<Home/>:tab==='Stats'?<Stats/>:tab==='Crew'?<CrewView/>:<Settings/>;
 if(loading)return <SafeAreaView style={{flex:1,backgroundColor:C.bg,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={C.accent}/><Text style={{color:C.muted,marginTop:12}}>Preparing your challenge...</Text></SafeAreaView>;
 return <SafeAreaView style={{flex:1,backgroundColor:C.bg}}><StatusBar barStyle={isLight?'dark-content':'light-content'}/><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal:19,paddingTop:12,paddingBottom:125}}>{screen}</ScrollView><View style={[styles.nav,{backgroundColor:C.card,borderColor:C.line}]}>{(['Home','Stats','Crew','Settings'] as Tab[]).map((t,i)=><TouchableOpacity key={t} onPress={()=>setTab(t)} style={[styles.navItem,{backgroundColor:tab===t?C.accent:'transparent'}]}><Ionicons name={(['home','stats-chart','people','settings'] as const)[i]} size={18} color={tab===t?C.accentInk:C.muted}/><Text style={{fontSize:10,fontWeight:'800',color:tab===t?C.accentInk:C.muted}}>{t}</Text></TouchableOpacity>)}</View>{notice!==''&&<View style={[styles.toast,{backgroundColor:C.fg}]}><Text style={{color:C.bg,fontWeight:'800'}}>{notice}</Text></View>}
 <Modal visible={showDays} animationType="slide" transparent onRequestClose={()=>setShowDays(false)}>
  <View style={styles.scrim}><View style={[styles.sheet,{backgroundColor:C.bg,maxHeight:'90%'}]}>
   <View style={styles.sheetHead}><View><Text style={{color:C.fg,fontSize:19,fontWeight:'900'}}>Your challenge days</Text><Text style={{color:C.muted,fontSize:10,marginTop:3}}>Choose a day to view its personal tasks</Text></View><TouchableOpacity onPress={()=>setShowDays(false)}><Ionicons name="close" size={24} color={C.fg}/></TouchableOpacity></View>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight:62,flexGrow:0}} contentContainerStyle={{alignItems:'center',paddingBottom:8}}>
    {Array.from({length:crew?.days||14},(_,i)=>i+1).map(d=><TouchableOpacity key={d} onPress={()=>loadDayRecords(d)} style={[styles.dayBtn,{width:47,height:53,backgroundColor:day===d?C.accent:C.card2,borderWidth:1,borderColor:day===d?C.accent:C.line}]}>
     <Text style={{color:day===d?C.accentInk:C.fg,fontWeight:'900'}}>{d}</Text><Text style={{color:day===d?C.accentInk:C.muted,fontSize:9}}>DAY</Text><View style={{width:5,height:5,borderRadius:3,marginTop:2,backgroundColor:(dayProgress[d-1]||0)>0?(day===d?C.accentInk:C.accent):C.muted}}/>
    </TouchableOpacity>)}
   </ScrollView>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginVertical:10}}><Text style={{color:C.fg,fontWeight:'900'}}>Day {day} tasks</Text><Text style={{color:day===currentDay?C.accent:C.muted,fontSize:10,fontWeight:'800'}}>{day===currentDay?'CURRENT DAY · EDITABLE':'HISTORY · READ ONLY'}</Text></View>
   <ScrollView keyboardShouldPersistTaps="handled" style={{flexGrow:0,maxHeight:390}}>
    {tasks.length?tasks.map(t=><TaskRow key={t.id} task={t}/>):<Text style={{color:C.muted,fontSize:12,textAlign:'center',padding:18}}>No personal tasks have been added to this crew yet.</Text>}
   </ScrollView>
   <TouchableOpacity style={[styles.cta,{backgroundColor:C.accent}]} onPress={()=>setShowDays(false)}><Text style={{color:C.accentInk,fontWeight:'900'}}>Done</Text></TouchableOpacity>
  </View></View>
 </Modal>
 <Modal visible={showPrayers} animationType="slide" transparent onRequestClose={()=>setShowPrayers(false)}>
  <View style={styles.scrim}><View style={[styles.sheet,{backgroundColor:C.bg,maxHeight:'88%'}]}>
   <View style={styles.sheetHead}><View style={{flex:1}}><Text style={{color:C.fg,fontSize:19,fontWeight:'900'}}>{activeTask?.title||'Task steps'}</Text><Text style={{color:C.muted,fontSize:11,marginTop:3}}>{activeTask?.details||'Complete each step. The task points are awarded only when all steps are checked.'}</Text></View><TouchableOpacity onPress={()=>setShowPrayers(false)}><Ionicons name="close" size={24} color={C.fg}/></TouchableOpacity></View>
   <ScrollView keyboardShouldPersistTaps="handled" style={{maxHeight:380}}>
    {(activeTask?.subtasks||[]).map((step,i)=>{const doneStep=subtaskDone.includes(activeTask!.id+':sub:'+i);return <TouchableOpacity key={i} onPress={()=>toggleSubtask(i)} style={[styles.task,{backgroundColor:C.card,borderColor:C.line}]}>
      <View style={[styles.check,{borderColor:doneStep?C.accent:C.muted,backgroundColor:doneStep?C.accent:'transparent'}]}>{doneStep&&<Ionicons name="checkmark" size={16} color={C.accentInk}/>}</View><Text style={{color:doneStep?C.muted:C.fg,flex:1,fontWeight:'700',textDecorationLine:doneStep?'line-through':'none'}}>{step}</Text>
     </TouchableOpacity>;})}
   </ScrollView>
   <Text style={{color:C.muted,fontSize:11,marginTop:4}}>{(activeTask?.subtasks||[]).filter((_,i)=>subtaskDone.includes((activeTask?.id||'')+':sub:'+i)).length}/{activeTask?.subtasks.length||0} steps complete · +{activeTask?.points||0} points when all are done</Text>
   <View style={{flexDirection:'row',gap:8,marginTop:8}}>
    <TouchableOpacity onPress={()=>{const t=activeTask;setShowPrayers(false);if(t)openTaskEditor(t);}} style={[styles.smallBtn,{backgroundColor:C.card2,flex:1,alignItems:'center'}]}><Text style={{color:C.fg,fontWeight:'900'}}>Edit task</Text></TouchableOpacity>
    <TouchableOpacity onPress={()=>setShowPrayers(false)} style={[styles.smallBtn,{backgroundColor:C.accent,flex:1,alignItems:'center'}]}><Text style={{color:C.accentInk,fontWeight:'900'}}>Done</Text></TouchableOpacity>
   </View>
  </View></View>
 </Modal>
 <Modal visible={modal!==null} animationType="slide" transparent onRequestClose={()=>setModal(null)}>
  <Pressable style={styles.scrim} onPress={()=>setModal(null)}>
   <Pressable style={[styles.sheet,{backgroundColor:C.bg,maxHeight:'90%'}]} onPress={()=>{}}>
    <View style={styles.sheetHead}><View style={{flex:1}}><Text style={{color:C.fg,fontSize:19,fontWeight:'900'}}>{modal==='task'?(activeTask?'Edit personal task':'New personal task'):modal==='create'?'Create a crew':modal==='join'?'Join a crew':modal==='account'?'Account & recovery':modal==='report'?'Report a member':'Privacy & moderation'}</Text><Text style={{color:C.muted,fontSize:10,marginTop:3}}>SONIUM · Make today count</Text></View><TouchableOpacity onPress={()=>setModal(null)}><Ionicons name="close" size={24} color={C.fg}/></TouchableOpacity></View>
    <ScrollView keyboardShouldPersistTaps="handled" style={{flexGrow:0}}>
     {modal==='task'?<>
      <Text style={{color:C.muted,fontSize:11,marginBottom:6}}>TASK NAME</Text>
      <TextInput value={taskTitle} onChangeText={setTaskTitle} maxLength={80} placeholder="e.g. Read 20 minutes" placeholderTextColor={C.muted} style={[styles.input,{color:C.fg,backgroundColor:C.card,borderColor:C.line}]}/>
      <Text style={{color:C.muted,fontSize:11,marginTop:12,marginBottom:6}}>DESCRIPTION (OPTIONAL)</Text>
      <TextInput value={taskDetails} onChangeText={setTaskDetails} maxLength={240} placeholder="What do you want to achieve?" placeholderTextColor={C.muted} multiline style={[styles.input,{color:C.fg,backgroundColor:C.card,borderColor:C.line,minHeight:70,textAlignVertical:'top'}]}/>
      <View style={{flexDirection:'row',gap:10,marginTop:12}}>
       <View style={{flex:1}}><Text style={{color:C.muted,fontSize:11,marginBottom:6}}>POINTS · 0–100</Text><TextInput value={taskPoints} onChangeText={setTaskPoints} keyboardType="number-pad" placeholder="10" placeholderTextColor={C.muted} style={[styles.input,{color:C.fg,backgroundColor:C.card,borderColor:C.line}]}/></View>
       <View style={{flex:1}}><Text style={{color:C.muted,fontSize:11,marginBottom:6}}>REMINDER TIME</Text><TextInput value={taskReminderTime} onChangeText={setTaskReminderTime} placeholder="20:00" placeholderTextColor={C.muted} keyboardType="numbers-and-punctuation" style={[styles.input,{color:C.fg,backgroundColor:C.card,borderColor:C.line}]}/></View>
      </View>
      <Text style={{color:C.muted,fontSize:11,marginTop:13,marginBottom:7}}>CHOOSE AN ICON</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
       {['checkmark-circle-outline','water-outline','book-outline','barbell-outline','calendar-outline','moon-outline','school-outline','heart-outline','walk-outline','briefcase-outline','fitness-outline','star-outline'].map(ic=><TouchableOpacity key={ic} onPress={()=>setTaskIcon(ic)} style={{width:44,height:42,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:taskIcon===ic?C.accent:C.card2,borderWidth:1,borderColor:taskIcon===ic?C.accent:C.line}}><Ionicons name={ic as any} size={21} color={taskIcon===ic?C.accentInk:C.fg}/></TouchableOpacity>)}
      </View>
      <Text style={{color:C.muted,fontSize:11,marginTop:13,marginBottom:6}}>INNER STEPS · ONE PER LINE</Text>
      <TextInput value={taskSubtasks} onChangeText={setTaskSubtasks} placeholder={'Optional\nExample: warm up\nMain workout\nStretch'} placeholderTextColor={C.muted} multiline style={[styles.input,{color:C.fg,backgroundColor:C.card,borderColor:C.line,minHeight:105,textAlignVertical:'top'}]}/>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:14,backgroundColor:C.card,borderRadius:13,padding:11}}>
       <View style={{flex:1}}><Text style={{color:C.fg,fontWeight:'900'}}>Reminder for this task</Text><Text style={{color:C.muted,fontSize:10,marginTop:2}}>Independent daily reminder at {taskReminderTime}</Text></View>
       <Switch value={taskReminder} onValueChange={setTaskReminder} trackColor={{true:C.accent,false:C.card2}}/>
      </View>
      <TouchableOpacity disabled={taskSaving} onPress={saveTask} style={[styles.cta,{backgroundColor:C.accent,opacity:taskSaving?.6:1}]}><Text style={{color:C.accentInk,fontWeight:'900'}}>{taskSaving?'Saving...':activeTask?'Save task changes':'Create my task'}</Text></TouchableOpacity>
      {activeTask&&<TouchableOpacity onPress={()=>deleteTask(activeTask)} style={[styles.smallBtn,{backgroundColor:C.card2,marginTop:9,alignItems:'center'}]}><Text style={{color:C.flame,fontWeight:'900'}}>Delete this task</Text></TouchableOpacity>}
     </>:modal==='report'?<>
      <Text style={{color:C.muted,fontSize:12,marginBottom:8}}>Reports are private and reviewed by the app owner.</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{(['abuse','harassment','inappropriate','spam','other'] as const).map(v=><TouchableOpacity key={v} onPress={()=>setReportReason(v)} style={[styles.smallBtn,{backgroundColor:reportReason===v?C.accent:C.card2}]}><Text style={{color:reportReason===v?C.accentInk:C.fg,fontWeight:'800'}}>{v}</Text></TouchableOpacity>)}</View>
      <TextInput value={reportNote} onChangeText={setReportNote} placeholder="Details (optional)" placeholderTextColor={C.muted} multiline style={[styles.input,{color:C.fg,backgroundColor:C.card,borderColor:C.line,marginTop:10,minHeight:70}]}/>
      <TouchableOpacity onPress={submitReport} style={[styles.cta,{backgroundColor:C.accent}]}><Text style={{color:C.accentInk,fontWeight:'900'}}>Send report</Text></TouchableOpacity>
     </>:modal==='create'?<>
      <TextInput value={crewName} onChangeText={setCrewName} placeholder="Crew name" placeholderTextColor={C.muted} style={[styles.input,{color:C.fg,backgroundColor:C.card,borderColor:C.line}]}/>
      <TouchableOpacity onPress={createCrew} style={[styles.cta,{backgroundColor:C.accent}]}><Text style={{color:C.accentInk,fontWeight:'900'}}>Create crew</Text></TouchableOpacity>
     </>:modal==='join'?<>
      <TextInput value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" placeholder="Invite code" placeholderTextColor={C.muted} style={[styles.input,{color:C.fg,backgroundColor:C.card,borderColor:C.line}]}/>
      <TouchableOpacity onPress={joinCrew} style={[styles.cta,{backgroundColor:C.accent}]}><Text style={{color:C.accentInk,fontWeight:'900'}}>Join crew</Text></TouchableOpacity>
     </>:modal==='account'?<>
      <Text style={{color:C.muted,fontSize:12,lineHeight:18}}>Link this anonymous profile to an email and password to restore your progress on another phone. You may need to confirm the email from your inbox.</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" placeholderTextColor={C.muted} style={[styles.input,{color:C.fg,backgroundColor:C.card,borderColor:C.line,marginTop:10}]}/>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password (8+ characters)" placeholderTextColor={C.muted} style={[styles.input,{color:C.fg,backgroundColor:C.card,borderColor:C.line,marginTop:8}]}/>
      <TouchableOpacity onPress={saveAccount} style={[styles.cta,{backgroundColor:C.accent}]}><Text style={{color:C.accentInk,fontWeight:'900'}}>Link current account</Text></TouchableOpacity>
      <TouchableOpacity onPress={signIn} style={{marginTop:12}}><Text style={{color:C.accent,fontWeight:'800'}}>Sign in to existing account</Text></TouchableOpacity>
     </>:<>
      <Text style={{color:C.fg,fontSize:13,lineHeight:21}}>Crew chat messages are visible to crew members and may be reviewed by the app owner for safety and moderation. Do not share private or sensitive information in crew chat. Photo proof is intended to be visible only to members of the relevant crew. Each crew member can review another member's task photo.</Text>
      <TouchableOpacity onPress={()=>setModal(null)} style={[styles.cta,{backgroundColor:C.accent}]}><Text style={{color:C.accentInk,fontWeight:'900'}}>I understand</Text></TouchableOpacity>
     </>}
    </ScrollView>
   </Pressable>
  </Pressable>
 </Modal>
 </SafeAreaView>;
}

const styles=StyleSheet.create({top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:26},brand:{flexDirection:'row',alignItems:'center',gap:10},logo:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center'},card:{borderWidth:1,borderRadius:19,padding:14},section:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:25,marginBottom:10},sectionTitle:{fontSize:18,fontWeight:'900'},eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1,color:'#9ba292'},ring:{width:65,height:65,borderRadius:33,borderWidth:6,alignItems:'center',justifyContent:'center'},track:{height:7,borderRadius:8,overflow:'hidden'},fill:{height:7,borderRadius:8},task:{minHeight:51,borderWidth:1,borderRadius:15,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:11,marginBottom:8},check:{width:24,height:24,borderRadius:12,borderWidth:2,alignItems:'center',justifyContent:'center'},cta:{padding:14,borderRadius:30,alignItems:'center',justifyContent:'center',marginTop:10},tiles:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:20},statTile:{width:'48%',minHeight:108},nav:{position:'absolute',bottom:13,alignSelf:'center',width:'88%',borderWidth:1,borderRadius:40,padding:6,flexDirection:'row',justifyContent:'space-around',elevation:12},navItem:{alignItems:'center',gap:3,paddingHorizontal:15,paddingVertical:7,borderRadius:30,minWidth:62},smallBtn:{paddingHorizontal:13,paddingVertical:10,borderRadius:13},memberAvatar:{width:34,height:34,borderRadius:18,alignItems:'center',justifyContent:'center'},avatar:{width:58,height:58,borderRadius:30,borderWidth:1,alignItems:'center',justifyContent:'center'},settingLine:{height:1,backgroundColor:'rgba(150,150,150,0.16)',marginVertical:13},themeChoice:{flex:1,alignItems:'center',padding:9,borderRadius:12},input:{borderWidth:1,borderRadius:13,paddingHorizontal:13,paddingVertical:12,fontSize:14},send:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center'},scrim:{flex:1,backgroundColor:'rgba(0,0,0,0.65)',justifyContent:'flex-end'},sheet:{borderTopLeftRadius:26,borderTopRightRadius:26,padding:19,paddingBottom:30,maxHeight:'88%'},sheetHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16},dayBtn:{width:45,height:48,borderRadius:13,alignItems:'center',justifyContent:'center',marginRight:7},toast:{position:'absolute',bottom:95,alignSelf:'center',paddingHorizontal:15,paddingVertical:10,borderRadius:25,elevation:10}});
