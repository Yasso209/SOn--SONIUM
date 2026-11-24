import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Keyboard, KeyboardAvoidingView, Modal, Pressable, RefreshControl, SafeAreaView, ScrollView, Share, StatusBar, StyleSheet, Platform, Switch, Text as NativeText, TextInput as NativeTextInput, type TextProps, type TextInputProps, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useFonts } from 'expo-font';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
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
const STICKERS=['🔥','💪','🏆','⚡','🎯','👏','🚀','💚'];
const WEEKLY_VERDICT_PROMPTS=[
 'Finish one small task', 'Sort study notes', 'Plan next week', 'Read for 20 minutes',
 'Tidy your desk', 'Learn five words', 'Share a new skill', 'Plan tomorrow',
 'Review a new idea', 'Organize your goals', 'Try a creative task', 'Help a teammate'
];
function getWeeklyVerdictTitle(){
 const now=new Date();
 const d=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));
 const day=d.getUTCDay()||7;
 d.setUTCDate(d.getUTCDate()+4-day);
 const year=d.getUTCFullYear();
 const yearStart=new Date(Date.UTC(year,0,1));
 const week=Math.ceil((((d.getTime()-yearStart.getTime())/86400000)+1)/7);
 const prompt=WEEKLY_VERDICT_PROMPTS[(year*53+week)%WEEKLY_VERDICT_PROMPTS.length];
 return 'Weekly '+String(year).slice(-2)+'W'+String(week).padStart(2,'0')+' · '+prompt;
}
const AR:Record<string,string>={
 'Finish one small task':'أنجز مهمة صغيرة','Sort study notes':'رتب ملاحظات المذاكرة','Plan next week':'خطط للأسبوع الجاي','Read for 20 minutes':'اقرأ لمدة 20 دقيقة','Tidy your desk':'رتب مكتبك','Learn five words':'اتعلم خمس كلمات','Share a new skill':'شارك مهارة جديدة','Plan tomorrow':'خطط لبكرة','Review a new idea':'راجع فكرة جديدة','Organize your goals':'رتب أهدافك','Try a creative task':'جرب مهمة إبداعية','Help a teammate':'ساعد زميلًا',
 'Organize your study notes':'رتب ملاحظات مذاكرتك',
 'Plan next week together':'خططوا للأسبوع الجاي مع بعض',
 'Read something new for 20 minutes':'اقرأ حاجة جديدة لمدة 20 دقيقة',
 'Tidy your study space':'رتب مكان مذاكرتك',
 'Learn five new words':'اتعلم خمس كلمات جديدة',
 'Share one useful thing you learned':'شارك حاجة مفيدة اتعلمتها',
 'Prepare a simple plan for tomorrow':'جهز خطة بسيطة لبكرة',
 'Talk with your crew':'اتكلم مع فريقك',
 'Start the crew conversation.':'ابدأ محادثة مع فريقك.',
 'CREW POINTS':'نقاط الفريق','Members · ':'الأعضاء · ','in this crew':'في الفريق',
 'No crew yet':'لسه مفيش فريق','Your rank':'ترتيبك','Task steps':'خطوات المهمة',
 'Your challenge days':'أيام التحدي','Day tasks':'مهام اليوم','Done':'تم','Edit task':'تعديل المهمة',
 'No shared tasks yet. Add the first crew challenge above.':'لسه مفيش مهام مشتركة. أضف أول تحدي للفريق من فوق.',
 'Points appear here after tasks are completed.':'النقاط هتظهر هنا بعد إكمال المهام.',
 'Reports are private and reviewed by the app owner.':'البلاغات خاصة وبيتم مراجعتها من مسؤول التطبيق.',
 'Details (optional)':'تفاصيل (اختياري)','Send report':'إرسال البلاغ','Email address':'البريد الإلكتروني','Password (8+ characters)':'كلمة المرور (8 أحرف أو أكثر)',
 'Link current account':'ربط الحساب الحالي','Sign in to existing account':'تسجيل الدخول لحساب موجود',
 'Your goals. Your pace. Your challenge.':'أهدافك. على مهلك. تحديك.',
 'CHALLENGE PROGRESS':'تقدم التحدي','See all days →':'عرض كل الأيام ←','Build your own routine':'ابني روتينك',
 'These are your tasks only. Add the habits you want to complete every day.':'دي مهامك الشخصية. أضف العادات اللي عايز تلتزم بيها كل يوم.',
 '+ Create my first task':'+ أنشئ أول مهمة','QUICK START IDEAS':'أفكار للبداية السريعة','Add a personal task':'إضافة مهمة شخصية',
 'This challenge period has ended. Your history is still available in Stats.':'فترة التحدي دي انتهت. سجل تقدمك لسه موجود في الإحصائيات.',
 'Track your progress, keep going!':'تابع تقدمك وكمل!','Your challenge':'تحديك','TIME ELAPSED':'الوقت المنقضي',
 'Go to today\'s tasks →':'اذهب لمهام النهارده ←','Open your crew →':'افتح فريقك ←',
 'WEEKLY VERDICT · THIS WEEK':'حكم الأسبوع · الأسبوع ده','Your proof · other crew members can review it.':'الإثبات بتاعك · باقي أعضاء الفريق يقدروا يراجعوه.',
 'Create a crew or join your friends with an invite code.':'أنشئ فريق أو انضم لأصحابك بكود الدعوة.',
 'Choose a day to view its personal tasks':'اختار يوم عشان تشوف مهامه الشخصية','DAY':'اليوم',
 'SONIUM · Make today count':'سونيوم · خلّي النهارده له قيمة',
 'Reports are private and reviewed by the app owner.':'البلاغات خاصة وبيتم مراجعتها من مسؤول التطبيق.',
 'Crew chat messages are visible to crew members and may be reviewed by the app owner for safety and moderation. Do not share private or sensitive information in crew chat. Photo proof is intended to be visible only to members of the relevant crew. Each crew member can review another member\'s task photo.':'رسائل دردشة الفريق ظاهرة لأعضاء الفريق، وقد يراجعها مسؤول التطبيق للسلامة والإشراف. متشاركش معلومات شخصية أو حساسة في الدردشة. صور إثبات المهام مخصصة لأعضاء الفريق المعني فقط، ويقدر كل عضو يراجع إثباتات باقي الأعضاء.',
 'Talk with your crew':'اتكلم مع فريقك','Start the crew conversation.':'ابدأ محادثة مع فريقك.',
 'Home':'الرئيسية','Stats':'الإحصائيات','Crew':'الفريق','Settings':'الإعدادات',
 'YOUR PEOPLE':'أصحابك','YOUR ACCOUNT':'حسابك','Make it yours':'خصص تجربتك','Your':'مساحتك','Crew.':'فريقك.',
 'Build good habits with your people.':'ابنوا عادات أفضل مع بعض.','ACTIVE CREW':'الفريق الحالي','Invite friends +':'ادعُ أصحابك +','Invite':'دعوة','Report':'إبلاغ','You':'أنت',
 'YOUR RANK':'ترتيبك','in this crew':'في الفريق','Crew challenge progress':'تقدم تحدي الفريق','days left in the challenge':'يوم متبقي في التحدي','Crew leaderboard':'ترتيب الفريق',
 'Shared crew tasks':'مهام الفريق المشتركة','These tasks are shared by the whole crew. Each member submits a photo, then other members review whether the proof is valid.':'دي مهام مشتركة للفريق. كل عضو يرفع صورة، وباقي الأعضاء يراجعوا المهمة ويوافقوا عليها.',
 'Create a shared task...':'اكتب مهمة مشتركة...','+ Add shared task · 20 pts':'+ إضافة مهمة مشتركة · 20 نقطة','member proofs submitted':'إثباتات من الأعضاء','Add photo proof →':'أضف صورة إثبات ←',
 'Uploading photo…':'جارٍ رفع الصورة…','No shared tasks yet. Add the first crew challenge above.':'لسه مفيش مهام مشتركة. أضف أول تحدي للفريق من فوق.',
 'Weekly verdict':'مهمة الأسبوع','This week’s shared crew challenge':'تحدي الفريق لهذا الأسبوع',
 'This week\'s challenge is automatically added to Shared crew tasks above. Everyone submits a photo, and every other crew member must approve it before the crew points count.':'تحدي الأسبوع بيتضاف تلقائيًا للمهام المشتركة فوق. كل عضو يرفع صورة، وباقي أعضاء الفريق لازم يوافقوا عليها قبل احتساب النقاط.',
 'Crew activity':'نشاط الفريق','Show':'عرض','Hide':'إخفاء','Your crew activity will show here.':'نشاط الفريق هيظهر هنا.','Leave this crew':'مغادرة الفريق',
 'No crew yet':'لسه مفيش فريق','Create a crew':'إنشاء فريق','Join with invite code':'الانضمام بكود دعوة','Rename crew':'تعديل اسم الفريق',
 'Account & recovery':'الحساب واستعادة البيانات','Anonymous account':'حساب مجهول','Link email & password':'اربط إيميل وكلمة مرور',
 'Preferences':'التفضيلات','Appearance':'المظهر','Task reminder behavior':'تذكيرات المهام',
 'Each task has its own reminder switch and time. Edit a task to choose a separate time for it.':'كل مهمة ليها تذكير وميعاد خاص. افتح تعديل المهمة عشان تختار الميعاد.',
 'Language':'اللغة','English':'الإنجليزية','Arabic':'العربية','Dark':'داكن','Light':'فاتح','System':'حسب الجهاز',
 'Your crews':'فرقك','About':'عن التطبيق','SONIUM':'سونيوم','Created by Yassin Mohamed':'تطوير: Yassin Mohamed',
 'Privacy & moderation':'الخصوصية والإشراف','Share SONIUM':'مشاركة SONIUM','Help & Support · WhatsApp':'المساعدة والدعم · واتساب',
 'Your personal tasks':'مهامك الشخصية','Add task +':'إضافة مهمة +','No personal tasks yet. Create your first one from Home.':'مفيش مهام شخصية لسه. أنشئ أول مهمة من الرئيسية.',
 'TASK NAME':'اسم المهمة','DESCRIPTION (OPTIONAL)':'الوصف (اختياري)','POINTS · 0–100':'النقاط · 0–100','REMINDER TIME':'ميعاد التذكير','CHOOSE AN ICON':'اختر أيقونة',
 'INNER STEPS · ONE PER LINE':'الخطوات · كل خطوة في سطر','Reminder for this task':'تذكير للمهمة دي','Create my task':'إنشاء المهمة','Save task changes':'حفظ التعديلات','Delete this task':'حذف المهمة',
 'Join a crew':'الانضمام لفريق','Save':'حفظ','Cancel':'إلغاء','Preparing your challenge...':'جارٍ تجهيز التحدي...','Hold to preview all days':'اضغط مطولًا لمعاينة الأيام',
 'Keep Going · View your stats →':'كمل · شوف إحصائياتك ←','Your performance':'أداؤك','This week':'هذا الأسبوع','Crew chat':'دردشة الفريق','Write a message...':'اكتب رسالة...','Close':'إغلاق',
 'I understand':'فهمت','Create crew':'إنشاء الفريق','Join crew':'الانضمام للفريق','Crew name':'اسم الفريق','Invite code':'كود الدعوة',
 'Edit profile · Change photo':'تعديل الملف · تغيير الصورة','Choose photo':'اختيار صورة','Save profile':'حفظ الملف','No active crew':'لا يوجد فريق نشط',
 'Join another crew →':'انضم لفريق آخر ←','Create a new crew +':'إنشاء فريق جديد +','Start the crew conversation.':'ابدأ محادثة مع فريقك.',
 'Privacy & moderation':'الخصوصية والإشراف'
};
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
 const [language,setLanguage]=useState<'en'|'ar'>('en');
 const [crewActivityExpanded,setCrewActivityExpanded]=useState(false);
 const [chatOpen,setChatOpen]=useState(false);
 const [shareBusy,setShareBusy]=useState(false);
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
 const [proofUploadBusy,setProofUploadBusy]=useState<string|null>(null);
 const [keyboardVisible,setKeyboardVisible]=useState(false);
 const [refreshing,setRefreshing]=useState(false);
 const screenFade=useRef(new Animated.Value(1)).current;
 const [fontsLoaded]=useFonts(Ionicons.font);
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
 const [modal,setModal]=useState<'create'|'join'|'privacy'|'account'|'report'|'task'|'rename'|null>(null);
 const [reportUser,setReportUser]=useState('');
 const [reportNote,setReportNote]=useState('');
 const [reportReason,setReportReason]=useState('abuse');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [accountEmail,setAccountEmail]=useState('');
 const [accountVerified,setAccountVerified]=useState(false);
 const [profileEdit,setProfileEdit]=useState(false);
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
 const translate=(value:string)=>{
  if(language!=='ar')return value;
  const weekly=value.match(/^Weekly (\d{2}W\d{2}) · (.+)$/);
  if(weekly)return 'مهمة الأسبوع · '+(AR[weekly[2]]||weekly[2])+' · '+weekly[1];
  return AR[value]||value;
 };
 const Text=(props:TextProps)=><NativeText {...props} style={language==='ar'?[{writingDirection:'rtl',textAlign:'right'},props.style]:props.style}>{React.Children.map(props.children,child=>typeof child==='string'?translate(child):child)}</NativeText>;
 const TextInput=(props:TextInputProps)=><NativeTextInput {...props} showSoftInputOnFocus={true} placeholder={props.placeholder?translate(props.placeholder):props.placeholder} style={language==='ar'?[{writingDirection:'rtl',textAlign:'right'},props.style]:props.style}/>;
 const completed=tasks.filter(t=>done.includes(t.id)).length;
 const progress=tasks.length?Math.round(completed/tasks.length*100):0;
 const totalPoints=useMemo(()=>tasks.filter(t=>done.includes(t.id)).reduce((s,t)=>s+t.points,0),[done,tasks]);
 const weekPoints=weeklyPoints.reduce((sum,n)=>sum+n,0);
 const crewPoints=board.reduce((sum,p)=>sum+Number(p.points||0),0);
 const myRank=Math.max(0,board.findIndex(p=>p.user_id===userId)+1);
 const daysLeft=crew?Math.max(0,(crew.days||14)-currentDay):14-currentDay;
 const online=Boolean(isSupabaseConfigured&&userId);
 const toast=(s:string)=>{setNotice(s);setTimeout(()=>setNotice(''),3000);};
 const readLocalImageBuffer=async(uri:string)=>{
  const base64=await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64});
  if(!base64)throw new Error('Could not read the selected image. Try choosing it again.');
  return decode(base64);
 };
 const saveLocal=async(patch:Record<string,unknown>)=>{const raw=await AsyncStorage.getItem(STORE);await AsyncStorage.setItem(STORE,JSON.stringify({...(raw ? JSON.parse(raw) : {}), ...patch}));};

 useEffect(()=>{let active=true;(async()=>{try{
  const raw=await AsyncStorage.getItem(STORE);
  if(raw&&active){const s=JSON.parse(raw);setName(s.name||'Player');setAvatar(s.avatar||null);setDone(s.done||[]);setSubtaskDone(s.subtaskDone||[]);setThemeMode(s.themeMode||'dark');setLanguage(s.language==='ar'?'ar':'en');}
  if(supabase){
   const {data:sess}=await supabase.auth.getSession();let uid=sess.session?.user.id;setAccountEmail(sess.session?.user.email||'');setAccountVerified(Boolean(sess.session?.user.email_confirmed_at));
   if(!uid){const {data,error}=await supabase.auth.signInAnonymously();if(error)throw error;uid=data.user?.id;}
   if(uid&&active){setUserId(uid);const {data:p}=await supabase.from('profiles').select('name,avatar_path').eq('id',uid).maybeSingle();if(p?.name)setName(p.name);if(p?.avatar_path){setAvatarPath(p.avatar_path);const {data:a}=await supabase.storage.from('avatars').createSignedUrl(p.avatar_path,3600);if(a?.signedUrl)setAvatar(a.signedUrl);}}
  }
 }catch(e:any){toast(e?.message||'Could not start SONIUM');}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[]);
 useEffect(()=>{saveLocal({name,avatar,done,subtaskDone,themeMode,language}).catch(()=>{});},[name,avatar,done,subtaskDone,themeMode,language]);
 useEffect(()=>{Animated.spring(progressAnim,{toValue:progressPeek?1:0,useNativeDriver:false,friction:8,tension:75}).start();},[progressPeek,progressAnim]);
 useEffect(()=>{
  const show=Keyboard.addListener('keyboardDidShow',()=>setKeyboardVisible(true));
  const hide=Keyboard.addListener('keyboardDidHide',()=>setKeyboardVisible(false));
  return()=>{show.remove();hide.remove();};
 },[]);
 const refreshStats=async(cId:string,uid:string)=>{
  if(!supabase)return;
  const since=new Date();since.setDate(since.getDate()-6);since.setHours(0,0,0,0);
  const {data}=await supabase.from('completions').select('points,done_at').eq('crew_id',cId).eq('user_id',uid).gte('done_at',since.toISOString());
  const {data:standing}=await supabase.from('crew_leaderboard').select('points').eq('crew_id',cId).eq('user_id',uid).maybeSingle();
  setTotalEarned(Number(standing?.points||0));
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
  const {data:serverDay,error:serverDayError}=await client.rpc('challenge_day',{c:selected.id});
  const elapsed=serverDayError?0:Number(serverDay);
  if(serverDayError)toast('Could not sync the challenge day. Refresh and try again.');
  const activeDay=Math.max(1,Math.min(selected.days||14,elapsed||1));
  setCurrentDay(activeDay);setDay(activeDay);setChallengeActive(!serverDayError&&elapsed>=1&&elapsed<=(selected.days||14));
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
  let {data:shared}=await client.from('shared_tasks').select('id,title,points,created_by,created_at,shared_proofs(id,user_id,photo_path,created_at,shared_proof_reviews(id,reviewer_id,approved,note))').eq('crew_id',selected.id).order('created_at',{ascending:false});
  const weeklyTitle=getWeeklyVerdictTitle();
  if(!(shared||[]).some((t:any)=>t.title===weeklyTitle)){
   await client.from('shared_tasks').insert({crew_id:selected.id,title:weeklyTitle,points:20,created_by:userId});
   const refreshed=await client.from('shared_tasks').select('id,title,points,created_by,created_at,shared_proofs(id,user_id,photo_path,created_at,shared_proof_reviews(id,reviewer_id,approved,note))').eq('crew_id',selected.id).order('created_at',{ascending:false});
   if(refreshed.data)shared=refreshed.data;
  }
  const orderedShared=(shared||[]).sort((a:any,b:any)=>Number(b.title===weeklyTitle)-Number(a.title===weeklyTitle));
  const enriched=await Promise.all(orderedShared.map(async(t:any)=>({...t,shared_proofs:await Promise.all((t.shared_proofs||[]).map(async(p:any)=>{const {data}=await client.storage.from('proofs').createSignedUrl(p.photo_path,3600);return {...p,signedUrl:data?.signedUrl||null,reviews:p.shared_proof_reviews||[]};}))})));
  setSharedTasks(enriched);
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
  const shareSonium=async()=>{
   const apkUrl='https://github.com/Yasso209/SOn--SONIUM/releases/latest/download/SONIUM.apk';
   if(shareBusy)return;
   setShareBusy(true);
   try{
    const base=FileSystem.cacheDirectory||FileSystem.documentDirectory;
    if(!base)throw new Error('Storage is not available on this device.');
    const destination=base+'SONIUM.apk';
    const existing=await FileSystem.getInfoAsync(destination);
    if(existing.exists)await FileSystem.deleteAsync(destination,{idempotent:true});
    const downloaded=await FileSystem.downloadAsync(apkUrl,destination);
    const info=await FileSystem.getInfoAsync(downloaded.uri);
    if(!info.exists||!info.size)throw new Error('The latest APK could not be downloaded.');
    if(await Sharing.isAvailableAsync()){
     await Sharing.shareAsync(downloaded.uri,{mimeType:'application/vnd.android.package-archive',dialogTitle:'Share SONIUM APK'});
    }else{
     await Share.share({message:'Download the latest SONIUM APK: '+apkUrl});
    }
   }catch(e:any){toast(e?.message||'Could not share SONIUM. Check your connection and try again.');}
   finally{setShareBusy(false);}
  };
 
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
     const imageBytes=await readLocalImageBuffer(avatar);
     if(imageBytes.byteLength>5*1024*1024)throw new Error('Profile photo must be 5 MB or smaller.');
     const {error:uploadError}=await supabase.storage.from('avatars').upload(path,imageBytes,{contentType:ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg',cacheControl:'3600',upsert:false});
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
 const leaveCrew=()=>Alert.alert('Leave crew?','You can join again with an invite code.',[{text:'Cancel',style:'cancel'},{text:'Leave',style:'destructive',onPress:async()=>{if(supabase&&userId&&crew){const {error}=await supabase.from('crew_members').delete().match({crew_id:crew.id,user_id:userId});if(error)toast(error.message);else{setActiveCrewId(null);setCrew(null);await loadCrew();}}}}]);
 const saveCrew=async(patch:Record<string,any>)=>{if(!supabase||!crew)return;const {error}=await supabase.from('crews').update(patch).eq('id',crew.id);if(error)toast(error.message);else{setCrew({...crew,...patch});setCrews(old=>old.map(c=>c.id===crew.id?{...c,...patch}:c));toast('Crew settings saved');}};
 const adminSetBan=async(id:string,banned:boolean)=>{if(!supabase)return;const {error}=await supabase.rpc('admin_set_banned',{p_user_id:id,p_banned:banned});if(error)toast(error.message);else{setAdminProfiles(old=>old.map(p=>p.id===id?{...p,banned}:p));toast(banned?'Account banned':'Ban removed');}};
 const adminSetReport=async(id:number,status:string)=>{if(!supabase)return;const {error}=await supabase.rpc('admin_update_report',{p_report_id:id,p_status:status});if(error)toast(error.message);else{setAdminReports(old=>old.map(r=>r.id===id?{...r,status}:r));toast('Report updated');}};
 const adminDeleteMessage=async(id:number)=>{if(!supabase)return;const {error}=await supabase.rpc('admin_delete_message',{p_message_id:id});if(error)toast(error.message);else{setAdminMessages(old=>old.filter(m=>m.id!==id));toast('Message removed');}};
 const adminRemoveMember=async(crewId:string,memberId:string)=>{if(!supabase)return;const {error}=await supabase.rpc('admin_remove_crew_member',{p_crew_id:crewId,p_user_id:memberId});if(error)toast(error.message);else{setAdminCrews(old=>old.map(c=>c.id===crewId?{...c,members:c.members.filter((m:any)=>m.user_id!==memberId)}:c));toast('Member removed');}};
 const adminDeleteCrew=async(crewId:string)=>Alert.alert('Delete crew?','This removes the crew and its challenge data.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{if(!supabase)return;const {error}=await supabase.rpc('admin_delete_crew',{p_crew_id:crewId});if(error)toast(error.message);else{setAdminCrews(old=>old.filter(c=>c.id!==crewId));toast('Crew deleted');}}}]);
 const submitReport=async()=>{if(!supabase||!userId||!crew||!reportUser)return;const {data,error}=await supabase.from('reports').insert({reporter_id:userId,reported_id:reportUser,crew_id:crew.id,reason:reportReason,note:reportNote.trim()||null}).select('id').single();if(error){toast(error.message);return;}const result=await supabase.functions.invoke('notify-report',{body:{report_id:data.id}});toast(result.error?'Report saved; email alert is not configured yet':'Report sent for review');setModal(null);setReportUser('');setReportNote('');};
 const createSharedTask=async()=>{if(!newSharedTask.trim()||!supabase||!userId||!crew)return;const {error}=await supabase.from('shared_tasks').insert({crew_id:crew.id,title:newSharedTask.trim().slice(0,40),points:20,created_by:userId});if(error)toast(error.message);else{setNewSharedTask('');await loadCrew();toast('Crew task added');}};
 const submitProof=async(taskId:string,source:'camera'|'library'='camera')=>{
  if(!supabase||!userId||!crew)return;
  try{
   let picked:ImagePicker.ImagePickerResult;
   if(source==='camera'){
    const permission=await ImagePicker.requestCameraPermissionsAsync();
    if(!permission.granted){toast('Allow camera access to take a proof photo.');return;}
    picked=await ImagePicker.launchCameraAsync({mediaTypes:['images'],allowsEditing:true,quality:0.55});
   }else{
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){toast('Allow photo-library access to choose a proof image.');return;}
    picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,quality:0.55});
   }
   if(picked.canceled)return;
   const asset=picked.assets?.[0];
   if(!asset?.uri){toast('The selected image could not be opened.');return;}
   setProofUploadBusy(taskId);
   const mime=asset.mimeType||'image/jpeg';
   const ext=mime.includes('png')?'png':mime.includes('webp')?'webp':'jpg';
   const path=crew.id+'/'+userId+'/'+Date.now()+'.'+ext;
   const imageBytes=await readLocalImageBuffer(asset.uri);
   if(imageBytes.byteLength>10*1024*1024)throw new Error('This image is over 10 MB. Choose a smaller photo.');
   const {error:uploadError}=await supabase.storage.from('proofs').upload(path,imageBytes,{contentType:mime,cacheControl:'3600',upsert:false});
   if(uploadError)throw uploadError;
   const {error:recordError}=await supabase.from('shared_proofs').insert({shared_task_id:taskId,crew_id:crew.id,user_id:userId,photo_path:path});
   if(recordError){await supabase.storage.from('proofs').remove([path]);throw recordError;}
   await loadCrew();
   toast('Photo uploaded · waiting for crew approval');
  }catch(e:any){
   toast(e?.message||'Could not upload this photo. Check your connection and try again.');
  }finally{
   setProofUploadBusy(null);
  }
 };
 const chooseProofSource=(taskId:string)=>Alert.alert('Add photo proof','Choose how to attach your proof photo.',[
  {text:'Take a photo',onPress:()=>submitProof(taskId,'camera')},
  {text:'Choose from gallery',onPress:()=>submitProof(taskId,'library')},
  {text:'Cancel',style:'cancel'}
 ]);

 const saveAccount=async()=>{if(!supabase||!email.includes('@'))return toast('Enter a valid email address');const {data:current,error:getError}=await supabase.auth.getUser();if(getError||!current.user)return toast(getError?.message||'Sign in again first');const verified=Boolean(current.user.email_confirmed_at)&&current.user.email?.toLowerCase()===email.trim().toLowerCase();setAccountVerified(verified);if(!verified){const {data,error}=await supabase.auth.updateUser({email:email.trim()});if(error){toast(error.message);return;}setAccountEmail(email.trim());toast('Confirmation email sent. Confirm it, then return here to set your password.');return;}if(password.length<8)return toast('After confirming your email, enter a password of at least 8 characters');const {error}=await supabase.auth.updateUser({password});if(error)toast(error.message);else{setPassword('');setAccountEmail(email.trim());setAccountVerified(true);toast('Password saved · your account is now recoverable');}};
 const signIn=async()=>{if(!supabase||!email.includes('@')||!password)return;const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)toast(error.message);else{setUserId(data.user.id);setAccountEmail(data.user.email||email.trim());setAccountVerified(Boolean(data.user.email_confirmed_at));const {data:p}=await supabase.from('profiles').select('name,avatar_path').eq('id',data.user.id).maybeSingle();if(p?.name)setName(p.name);if(p?.avatar_path){setAvatarPath(p.avatar_path);const {data:a}=await supabase.storage.from('avatars').createSignedUrl(p.avatar_path,3600);if(a?.signedUrl)setAvatar(a.signedUrl);}setModal(null);setPassword('');toast('Account restored and synced');}};
 const Card=({children,style}:any)=><View style={[styles.card,{backgroundColor:C.card,borderColor:C.line},style]}>{children}</View>;
 const Section=({title,right,onRight}:any)=>{
  const key=String(title).toLowerCase();
  const icon=key.includes('task')?'checkbox-outline':key.includes('performance')||key.includes('progress')?'stats-chart-outline':key.includes('crew')||key.includes('member')?'people-outline':key.includes('leaderboard')?'trophy-outline':key.includes('chat')?'chatbubbles-outline':key.includes('about')?'information-circle-outline':key.includes('preference')?'options-outline':key.includes('account')?'person-circle-outline':key.includes('activity')?'pulse-outline':'star-outline';
  return <View style={styles.section}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Ionicons name={icon as any} size={19} color={C.accent}/><Text style={[styles.sectionTitle,{color:C.fg}]}>{title}</Text></View>{right&&<TouchableOpacity onPress={onRight}><Text style={{color:C.accent,fontWeight:'800'}}>{right}</Text></TouchableOpacity>}</View>;
 };
 const TaskRow=({task}: {task:PersonalTask})=>{
  const checked=done.includes(task.id);const stepsDone=(task.subtasks||[]).filter((_,i)=>subtaskDone.includes(task.id+':sub:'+i)).length;const hasSteps=(task.subtasks||[]).length>0;
  return <Pressable onPress={()=>{if(hasSteps){setActiveTask(task);setShowPrayers(true);}else toggleTask(task.id);}} onLongPress={()=>{if(hasSteps){setActiveTask(task);setShowPrayers(true);}else openTaskEditor(task);}} delayLongPress={450} style={[styles.task,{backgroundColor:C.card,borderColor:C.line}]}>
   <View style={{width:29,height:29,borderRadius:9,backgroundColor:C.card2,alignItems:'center',justifyContent:'center'}}><Ionicons name={task.icon as any} size={20} color={checked?C.muted:C.accent}/></View>
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
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><View style={{flex:1}}><Text style={styles.eyebrow}>ACTIVE CREW</Text><View style={{flexDirection:'row',alignItems:'center'}}><Text style={{color:C.fg,fontSize:21,fontWeight:'900',marginTop:5}}>{crew.name}</Text><TouchableOpacity accessibilityLabel="Edit crew name" onPress={()=>{setRename(crew.name);setModal('rename');}} style={{padding:7,marginTop:4}}><Ionicons name="create-outline" size={16} color={C.muted}/></TouchableOpacity></View><Text style={{color:C.muted,fontSize:11,marginTop:3}}>Invite code · {crew.invite_code}</Text></View><TouchableOpacity onPress={()=>Share.share({message:'Join my SONIUM crew: '+Linking.createURL('join',{queryParams:{code:crew.invite_code}})+'\nInvite code: '+crew.invite_code})} style={[styles.smallBtn,{backgroundColor:C.card2}]}><Ionicons name="share-social-outline" size={20} color={C.accent}/></TouchableOpacity></View>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:17}}><Text style={{color:C.fg,fontWeight:'900'}}>Members · {members.length}</Text><TouchableOpacity onPress={()=>Share.share({message:'Join my SONIUM crew. Invite code: '+crew.invite_code})}><Text style={{color:C.accent,fontWeight:'900',fontSize:12}}>Invite friends +</Text></TouchableOpacity></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:17,paddingTop:13,paddingBottom:4}}>
     {members.map(m=><View key={m.user_id} style={{alignItems:'center',width:61}}><View style={[styles.memberAvatar,{width:48,height:48,borderRadius:25,backgroundColor:C.card2,borderWidth:m.user_id===userId?2:1,borderColor:m.user_id===userId?C.accent:C.line,overflow:'hidden'}]}>{m.avatar_url?<Image source={{uri:m.avatar_url}} style={{width:46,height:46,borderRadius:23}}/>:<Text style={{color:C.fg,fontSize:17,fontWeight:'900'}}>{m.name.slice(0,1).toUpperCase()}</Text>}</View><Text numberOfLines={1} style={{color:m.user_id===userId?C.accent:C.fg,fontSize:10,fontWeight:'800',marginTop:6}}>{m.user_id===userId?'You':m.name}</Text>{m.user_id!==userId&&<TouchableOpacity onPress={()=>{setReportUser(m.user_id);setModal('report');}}><Text style={{color:C.muted,fontSize:9,marginTop:3}}>Report</Text></TouchableOpacity>}</View>)}
     <TouchableOpacity onPress={()=>Share.share({message:'Join my SONIUM crew. Invite code: '+crew.invite_code})} style={{alignItems:'center',width:61}}><View style={{width:48,height:48,borderRadius:25,borderWidth:1,borderStyle:'dashed',borderColor:C.muted,alignItems:'center',justifyContent:'center'}}><Ionicons name="add" size={25} color={C.accent}/></View><Text style={{color:C.muted,fontSize:10,marginTop:6}}>Invite</Text></TouchableOpacity>
    </ScrollView>
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
   <Section title="Shared crew tasks"/>
   <Card style={{padding:15}}>
    <Text style={{color:C.muted,fontSize:11,lineHeight:17}}>These tasks are shared by the whole crew. Each member submits a photo, then other members review whether the proof is valid.</Text>
    <TextInput value={newSharedTask} onChangeText={setNewSharedTask} maxLength={40} placeholder="Create a shared task..." placeholderTextColor={C.muted} style={[styles.input,{color:C.fg,backgroundColor:C.card2,borderColor:C.line,marginTop:12}]}/>
    <TouchableOpacity onPress={createSharedTask} style={[styles.smallBtn,{backgroundColor:C.accent,marginTop:8,alignItems:'center'}]}><Text style={{color:C.accentInk,fontWeight:'900'}}>+ Add shared task · 20 pts</Text></TouchableOpacity>
    {sharedTasks.map(t=><View key={t.id} style={{paddingVertical:13,borderBottomWidth:1,borderBottomColor:C.line}}>
      {t.title===getWeeklyVerdictTitle()&&<Text style={{color:C.accent,fontSize:9,fontWeight:'900',letterSpacing:1,marginBottom:5}}>WEEKLY VERDICT · THIS WEEK</Text>}
     <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={{color:C.fg,fontWeight:'900',flex:1}}>{t.title}</Text><Text style={{color:C.accent,fontWeight:'900'}}>+{t.points} pts</Text></View>
     <Text style={{color:C.muted,fontSize:10,marginTop:4}}>{(t.shared_proofs||[]).length} member proofs submitted</Text>
     {(t.shared_proofs||[]).map((p:any)=>{
      const reviews=p.reviews||[];const yes=reviews.filter((v:any)=>v.approved).length;const no=reviews.filter((v:any)=>!v.approved).length;const required=Math.max(0,members.length-1);const approved=reviews.length===required&&yes===required;const myVote=reviews.find((v:any)=>v.reviewer_id===userId);
      return <View key={p.id} style={{marginTop:11,padding:10,borderRadius:14,backgroundColor:C.card2}}>
       <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{color:C.fg,fontSize:11,fontWeight:'900'}}>{members.find(m=>m.user_id===p.user_id)?.name||'Crew member'}'s proof</Text><Text style={{color:C.muted,fontSize:9}}>{new Date(p.created_at||Date.now()).toLocaleDateString()}</Text></View>
       {p.signedUrl&&<Image source={{uri:p.signedUrl}} style={{width:'100%',height:190,borderRadius:10,marginTop:8}} resizeMode="cover" onError={()=>toast('Could not load this proof image. Pull to refresh and try again.')}/>}
       <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:8}}><Text style={{color:C.accent,fontSize:10,fontWeight:'800'}}>✓ {yes} approve</Text><Text style={{color:C.flame,fontSize:10,fontWeight:'800'}}>✕ {no} reject</Text></View>
       <Text style={{color:approved?C.accent:no?C.flame:C.muted,fontSize:10,fontWeight:'900',marginTop:7}}>{approved?'APPROVED · +'+t.points+' crew points':no>0?'NOT APPROVED · redo required':(required-reviews.length)+' member reviews remaining'}</Text>
       {p.user_id!==userId?<View style={{flexDirection:'row',gap:8,marginTop:8}}>
        <TouchableOpacity disabled={proofReviewBusy===p.id} onPress={()=>voteProof(p.id,crew.id,true)} style={[styles.smallBtn,{backgroundColor:C.accent,flex:1,alignItems:'center'}]}><Text style={{color:C.accentInk,fontWeight:'900',fontSize:11}}>{myVote?.approved?'✓ Approved':'Looks correct'}</Text></TouchableOpacity>
        <TouchableOpacity disabled={proofReviewBusy===p.id} onPress={()=>voteProof(p.id,crew.id,false)} style={[styles.smallBtn,{backgroundColor:C.bg,flex:1,alignItems:'center'}]}><Text style={{color:C.fg,fontWeight:'900',fontSize:11}}>{myVote&&!myVote.approved?'✓ Needs redo':'Not correct'}</Text></TouchableOpacity>
       </View>:<Text style={{color:C.muted,fontSize:10,marginTop:7}}>Your proof · other crew members can review it.</Text>}
      </View>;
     })}
     {!(t.shared_proofs||[]).some((p:any)=>p.user_id===userId)&&<TouchableOpacity disabled={proofUploadBusy===t.id} onPress={()=>chooseProofSource(t.id)} style={[styles.smallBtn,{backgroundColor:C.accent,alignSelf:'flex-start',marginTop:9,opacity:proofUploadBusy===t.id?0.55:1}]}><Text style={{color:C.accentInk,fontWeight:'900'}}>{proofUploadBusy===t.id?'Uploading photo…':'Add photo proof →'}</Text></TouchableOpacity>}
    </View>)}
    {sharedTasks.length===0&&<Text style={{color:C.muted,fontSize:12,textAlign:'center',padding:12}}>No shared tasks yet. Add the first crew challenge above.</Text>}
   </Card>
    <Section title="Weekly verdict"/>
    <Card style={{padding:15}}>
      <Text style={{color:C.fg,fontSize:15,fontWeight:'900'}}>{getWeeklyVerdictTitle().replace(/^Weekly \d{2}W\d{2} · /,'')}</Text>
     <Text style={{color:C.muted,fontSize:11,lineHeight:18,marginTop:7}}>This week's challenge is automatically added to Shared crew tasks above. Everyone submits a photo, and every other crew member must approve it before the crew points count.</Text>
     <Text style={{color:C.accent,fontSize:10,fontWeight:'900',marginTop:9}}>{sharedTasks.find(t=>t.title===getWeeklyVerdictTitle())?((sharedTasks.find(t=>t.title===getWeeklyVerdictTitle()).shared_proofs||[]).length+' member proofs submitted'):'Preparing this week’s shared task…'}</Text>
    </Card>
    <Section title="Crew activity" right={crewActivityExpanded?'Hide':'Show'} onRight={()=>setCrewActivityExpanded(v=>!v)}/>
    {crewActivityExpanded&&<Card>{messages.slice(-3).reverse().map(m=><View key={String(m.id)} style={{paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.line}}><Text style={{color:C.fg,fontSize:12}}><Text style={{fontWeight:'900'}}>{m.user_id===userId?'You':members.find(x=>x.user_id===m.user_id)?.name||'Member'}</Text> {m.body||m.sticker}</Text><Text style={{color:C.muted,fontSize:9,marginTop:3}}>{new Date(m.created_at).toLocaleString()}</Text></View>)}{messages.length===0&&<Text style={{color:C.muted,fontSize:12}}>Your crew activity will show here.</Text>}</Card>}
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
   <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Ionicons name="shield-checkmark" size={21} color={accountEmail?C.accent:C.muted}/><Text style={{color:C.fg,fontWeight:'900'}}>{accountEmail?(accountVerified?accountEmail:'Verify email · '+accountEmail):'Anonymous account'}</Text></View>
   <Text style={{color:C.muted,fontSize:11,lineHeight:18,marginTop:6}}>{accountVerified?'Your email is confirmed and your password is linked. Use this email and password to restore the same SONIUM profile on another phone.':accountEmail?'We sent a verification email. Confirm it, then return here and enter your password to finish linking.':'Your progress is currently tied to this device session. Link an email and password to restore it if you change phones.'}</Text>
   <TouchableOpacity onPress={()=>setModal('account')} style={[styles.smallBtn,{backgroundColor:C.accent,alignSelf:'flex-start',marginTop:11}]}><Text style={{color:C.accentInk,fontWeight:'900'}}>{accountVerified?'Update password':accountEmail?'Set password after verification':'Link email & password'}</Text></TouchableOpacity>
  </Card>
  <Section title="Preferences"/>
  <Card style={{padding:16}}>
   <Text style={{color:C.fg,fontWeight:'800'}}>Appearance</Text>
    <View style={{flexDirection:'row',gap:7,marginTop:9}}>{(['dark','light','system'] as ThemeMode[]).map(m=><TouchableOpacity key={m} onPress={()=>setThemeMode(m)} style={[styles.themeChoice,{backgroundColor:themeMode===m?C.accent:C.card2}]}><Text style={{color:themeMode===m?C.accentInk:C.fg,fontWeight:'800'}}>{m==='dark'?(language==='ar'?'داكن':'Dark'):m==='light'?(language==='ar'?'فاتح':'Light'):(language==='ar'?'حسب الجهاز':'System')}</Text></TouchableOpacity>)}</View>
   <View style={styles.settingLine}/>
   <Text style={{color:C.fg,fontWeight:'800'}}>Task reminder behavior</Text>
   <Text style={{color:C.muted,fontSize:11,lineHeight:17,marginTop:4}}>Each task has its own reminder switch and time. Edit a task to choose a separate time for it.</Text>
   <View style={styles.settingLine}/>
    <Text style={{color:C.fg,fontWeight:'800'}}>Language</Text>
    <View style={{flexDirection:'row',gap:8,marginTop:9}}>
     <TouchableOpacity onPress={()=>setLanguage('en')} style={[styles.themeChoice,{backgroundColor:language==='en'?C.accent:C.card2}]}><Text style={{color:language==='en'?C.accentInk:C.fg,fontWeight:'800'}}>English</Text></TouchableOpacity>
     <TouchableOpacity onPress={()=>setLanguage('ar')} style={[styles.themeChoice,{backgroundColor:language==='ar'?C.accent:C.card2}]}><Text style={{color:language==='ar'?C.accentInk:C.fg,fontWeight:'800'}}>العربية</Text></TouchableOpacity>
    </View>
  </Card>
  <Section title="Your crews"/>
  <Card><Text style={{color:C.fg,fontWeight:'800'}}>{crew?.name||'No active crew'}</Text>
   {crews.filter(c=>c.id!==activeCrewId).map(c=><TouchableOpacity key={c.id} onPress={()=>setActiveCrewId(c.id)} style={{paddingVertical:9}}><Text style={{color:C.accent}}>Switch to · {c.name}</Text></TouchableOpacity>)}
   <TouchableOpacity onPress={()=>setModal('join')} style={{marginTop:10}}><Text style={{color:C.accent,fontWeight:'800'}}>Join another crew →</Text></TouchableOpacity>
   <TouchableOpacity onPress={()=>setModal('create')} style={{marginTop:8}}><Text style={{color:C.accent,fontWeight:'800'}}>Create a new crew +</Text></TouchableOpacity>
  </Card>
  <Section title="About"/>
   <Card style={{padding:16}}>
    <Text style={{color:C.fg,fontSize:16,fontWeight:'900'}}>SONIUM</Text>
    <Text style={{color:C.muted,fontSize:12,marginTop:4}}>Created by Yassin Mohamed</Text>
    <TouchableOpacity onPress={()=>setModal('privacy')} style={{marginTop:14}}><Text style={{color:C.accent}}>Privacy & moderation</Text></TouchableOpacity>
    <TouchableOpacity disabled={shareBusy} onPress={shareSonium} style={{marginTop:12,opacity:shareBusy?0.6:1}}><Text style={{color:C.accent,fontWeight:'800'}}>{shareBusy?'Preparing APK…':'Share SONIUM'}</Text></TouchableOpacity>
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
 const refreshApp=async()=>{
  if(refreshing)return;
  setRefreshing(true);
  try{await loadCrew();toast('SONIUM refreshed');}
  catch(e:any){toast(e?.message||'Could not refresh right now');}
  finally{setRefreshing(false);}
 };
 useEffect(()=>{
  screenFade.setValue(0.72);
  Animated.timing(screenFade,{toValue:1,duration:240,useNativeDriver:true}).start();
 },[tab,screenFade]);
 const screen=tab==='Home'?<Home/>:tab==='Stats'?<Stats/>:tab==='Crew'?<CrewView/>:<Settings/>;
 if(loading||!fontsLoaded)return <SafeAreaView style={{flex:1,backgroundColor:C.bg,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={C.accent}/><Text style={{color:C.muted,marginTop:12}}>Preparing your challenge...</Text></SafeAreaView>;
 return <KeyboardAvoidingView style={{flex:1}} enabled={Platform.OS==='ios'} behavior={Platform.OS==='ios'?'padding':undefined}><SafeAreaView style={{flex:1,backgroundColor:C.bg,direction:language==='ar'?'rtl':'ltr'}}><StatusBar barStyle={isLight?'dark-content':'light-content'}/><Animated.View style={{flex:1,opacity:screenFade}}><ScrollView keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshApp} tintColor={C.accent} colors={[C.accent]} progressBackgroundColor={C.card}/>} contentContainerStyle={{paddingHorizontal:19,paddingTop:12,paddingBottom:125}}>{screen}</ScrollView></Animated.View>{!keyboardVisible&&<View style={[styles.nav,{backgroundColor:C.card,borderColor:C.line}]}>{(['Home','Stats','Crew','Settings'] as Tab[]).map((t,i)=><TouchableOpacity key={t} accessibilityRole="button" accessibilityLabel={t} onPress={()=>setTab(t)} style={[styles.navItem,{backgroundColor:tab===t?C.accent:'transparent'}]}><Ionicons name={((['home','stats-chart','people','settings'] as const)[i]) as any} size={23} color={tab===t?C.accentInk:C.muted}/><Text style={{fontSize:11,fontWeight:'900',color:tab===t?C.accentInk:C.muted}}>{t}</Text></TouchableOpacity>)}</View>}{tab==='Crew'&&crew&&!keyboardVisible&&!chatOpen&&<TouchableOpacity accessibilityLabel="Open crew chat" onPress={()=>setChatOpen(true)} style={[styles.chatFab,{backgroundColor:C.accent}]}><Ionicons name="chatbubbles" size={23} color={C.accentInk}/></TouchableOpacity>}{notice!==''&&<View style={[styles.toast,{backgroundColor:C.fg}]}><Text style={{color:C.bg,fontWeight:'800'}}>{notice}</Text></View>}
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
  <Modal visible={chatOpen} animationType="slide" transparent statusBarTranslucent onRequestClose={()=>{Keyboard.dismiss();setChatOpen(false);}}>
   <View style={styles.scrim}>
    <Pressable style={[StyleSheet.absoluteFillObject,{zIndex:0}]} onPress={()=>{Keyboard.dismiss();setChatOpen(false);}}/>
    <KeyboardAvoidingView pointerEvents="box-none" enabled={Platform.OS==='ios'} behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,justifyContent:'flex-end',zIndex:1}}>
     <View style={[styles.sheet,{backgroundColor:C.bg,maxHeight:'82%',direction:language==='ar'?'rtl':'ltr'}]}>
      <View style={styles.sheetHead}><View style={{flex:1}}><Text style={{color:C.fg,fontSize:19,fontWeight:"900"}}>Crew chat</Text><Text style={{color:C.muted,fontSize:10,marginTop:3}}>Talk with your crew</Text></View><TouchableOpacity onPress={()=>{Keyboard.dismiss();setChatOpen(false);}}><Ionicons name="close" size={24} color={C.fg}/></TouchableOpacity></View>
      <ScrollView keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag" style={{height:280}} contentContainerStyle={{gap:9,paddingBottom:10}}>
       {messages.map(m=><View key={String(m.id)} style={{alignSelf:m.user_id===userId?'flex-end':'flex-start',maxWidth:'85%'}}><Text style={{color:C.muted,fontSize:10}}>{m.user_id===userId?'You':members.find(x=>x.user_id===m.user_id)?.name||'Member'}</Text><View style={{backgroundColor:m.user_id===userId?C.accent:C.card2,borderRadius:13,padding:9}}>{m.body&&<Text style={{color:m.user_id===userId?C.accentInk:C.fg}}>{m.body}</Text>}{m.sticker&&<Text style={{fontSize:26}}>{m.sticker}</Text>}</View></View>)}
       {messages.length===0&&<Text style={{color:C.muted,textAlign:"center",padding:20}}>Start the crew conversation.</Text>}
      </ScrollView>
      <View style={{flexDirection:"row",gap:7,marginTop:10,alignItems:"center"}}><TextInput value={message} onChangeText={setMessage} placeholder="Write a message..." placeholderTextColor={C.muted} style={[styles.input,{flex:1,color:C.fg,backgroundColor:C.card2,borderColor:C.line}]} onSubmitEditing={()=>sendMessage(message)} returnKeyType="send"/><TouchableOpacity onPress={()=>sendMessage(message)} style={[styles.send,{backgroundColor:C.accent}]}><Ionicons name="send" color={C.accentInk}/></TouchableOpacity></View>
      <View style={{flexDirection:'row',justifyContent:'space-around',marginTop:10}}>{STICKERS.map(s=><TouchableOpacity key={s} onPress={()=>sendMessage('',s)}><Text style={{fontSize:21}}>{s}</Text></TouchableOpacity>)}</View>
     </View>
    </KeyboardAvoidingView>
   </View>
  </Modal>
 <Modal visible={modal!==null} animationType="slide" transparent statusBarTranslucent={false} onRequestClose={()=>{Keyboard.dismiss();setModal(null);}}>
  <View style={styles.scrim}>
   <Pressable style={[StyleSheet.absoluteFillObject,{zIndex:0}]} onPress={()=>{Keyboard.dismiss();setModal(null);}} />
   <KeyboardAvoidingView pointerEvents="box-none" enabled={Platform.OS==='ios'} behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,justifyContent:'flex-end',zIndex:1}}>
    <View style={[styles.sheet,{backgroundColor:C.bg,maxHeight:'88%'}]}>
    <View style={styles.sheetHead}><View style={{flex:1}}><Text style={{color:C.fg,fontSize:19,fontWeight:'900'}}>{modal==='task'?(activeTask?'Edit personal task':'New personal task'):modal==='create'?'Create a crew':modal==='join'?'Join a crew':modal==='account'?'Account & recovery':modal==='report'?'Report a member':modal==='rename'?'Rename crew':'Privacy & moderation'}</Text><Text style={{color:C.muted,fontSize:10,marginTop:3}}>SONIUM · Make today count</Text></View><TouchableOpacity onPress={()=>setModal(null)}><Ionicons name="close" size={24} color={C.fg}/></TouchableOpacity></View>
    <ScrollView keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag" nestedScrollEnabled style={{flexShrink:1,maxHeight:'72%'}} >
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
      </>:modal==='rename'?<>
       <TextInput value={rename} onChangeText={setRename} maxLength={28} placeholder="Crew name" placeholderTextColor={C.muted} style={[styles.input,{color:C.fg,backgroundColor:C.card,borderColor:C.line}]}/>
       <TouchableOpacity onPress={()=>{const value=rename.trim();if(!value)return toast('Write a crew name first');saveCrew({name:value.slice(0,28)});setRename('');setModal(null);}} style={[styles.cta,{backgroundColor:C.accent}]}><Text style={{color:C.accentInk,fontWeight:'900'}}>Save</Text></TouchableOpacity>
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
    </View>
   </KeyboardAvoidingView>
  </View>
 </Modal>
 </SafeAreaView></KeyboardAvoidingView>;
}

const styles=StyleSheet.create({top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:26},brand:{flexDirection:'row',alignItems:'center',gap:10},logo:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center'},card:{borderWidth:1,borderRadius:19,padding:14},section:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:25,marginBottom:10},sectionTitle:{fontSize:18,fontWeight:'900'},eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1,color:'#9ba292'},ring:{width:65,height:65,borderRadius:33,borderWidth:6,alignItems:'center',justifyContent:'center'},track:{height:7,borderRadius:8,overflow:'hidden'},fill:{height:7,borderRadius:8},task:{minHeight:51,borderWidth:1,borderRadius:15,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:11,marginBottom:8},check:{width:24,height:24,borderRadius:12,borderWidth:2,alignItems:'center',justifyContent:'center'},cta:{padding:14,borderRadius:30,alignItems:'center',justifyContent:'center',marginTop:10},tiles:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:20},statTile:{width:'48%',minHeight:108},nav:{position:'absolute',bottom:10,alignSelf:'center',width:'94%',borderWidth:1,borderRadius:40,padding:6,flexDirection:'row',justifyContent:'space-around',elevation:16},navItem:{alignItems:'center',justifyContent:'center',gap:4,paddingHorizontal:10,paddingVertical:8,borderRadius:30,minWidth:70,flex:1},smallBtn:{paddingHorizontal:13,paddingVertical:10,borderRadius:13},memberAvatar:{width:34,height:34,borderRadius:18,alignItems:'center',justifyContent:'center'},avatar:{width:58,height:58,borderRadius:30,borderWidth:1,alignItems:'center',justifyContent:'center'},settingLine:{height:1,backgroundColor:'rgba(150,150,150,0.16)',marginVertical:13},themeChoice:{flex:1,alignItems:'center',padding:9,borderRadius:12},input:{borderWidth:1,borderRadius:13,paddingHorizontal:13,paddingVertical:12,fontSize:14},send:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center'},scrim:{flex:1,backgroundColor:'rgba(0,0,0,0.65)',justifyContent:'flex-end'},sheet:{borderTopLeftRadius:26,borderTopRightRadius:26,padding:19,paddingBottom:30,maxHeight:'88%'},sheetHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16},chatFab:{position:'absolute',right:22,bottom:96,width:54,height:54,borderRadius:28,alignItems:'center',justifyContent:'center',elevation:16,shadowOpacity:0.22,shadowRadius:8,shadowOffset:{width:0,height:4}},dayBtn:{width:45,height:48,borderRadius:13,alignItems:'center',justifyContent:'center',marginRight:7},toast:{position:'absolute',bottom:95,alignSelf:'center',paddingHorizontal:15,paddingVertical:10,borderRadius:25,elevation:10}});
