import React,{useState}from"react";
import{ActivityIndicator,ScrollView,StyleSheet,Text,TouchableOpacity,View}from"react-native";
import{useRouter}from"expo-router";
import{useQuery}from"@tanstack/react-query";
import{Feather}from"@expo/vector-icons";
import{useColors}from"@/hooks/useColors";
import{medpayApi,MonthlyRegister as MonthlyRegisterData,RegisterAgency}from"@/lib/medpayApi";

const money=(n:number)=>`₹${Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}`;
const monthKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const monthLabel=(key:string)=>new Date(`${key}-01T00:00:00`).toLocaleDateString("en-IN",{month:"long",year:"numeric"});

export default function MonthlyRegister(){
 const colors=useColors(),router=useRouter(),[month,setMonth]=useState(monthKey(new Date()));
 const q=useQuery({queryKey:["global-monthly-register",month],queryFn:()=>medpayApi<MonthlyRegisterData>(`/api/monthly-register?month=${month}`)});
 const move=(by:number)=>{const d=new Date(`${month}-01T00:00:00`);d.setMonth(d.getMonth()+by);setMonth(monthKey(d))};
 const open=(a:RegisterAgency)=>router.push({pathname:"/register/agency",params:{agencyId:String(a.agencyId),agencyName:a.agencyName,month}}as any);
 const agencies=q.data?.agencies||[],total=q.data?.summary;
 const status=(a:RegisterAgency)=>a.status==="paid"?"CLEAR":a.status==="partial"?"PARTIAL":"DUE";
 return <View style={[s.page,{backgroundColor:colors.background}]}><ScrollView contentContainerStyle={s.content}>
  <Text style={[s.title,{color:colors.foreground}]}>Agency Monthly Register</Text>
  <View style={[s.monthBar,{backgroundColor:colors.card,borderColor:colors.border}]}><TouchableOpacity onPress={()=>move(-1)} style={s.arrow}><Feather name="chevron-left" size={25} color={colors.primary}/></TouchableOpacity><View style={{alignItems:"center"}}><Text style={[s.month,{color:colors.foreground}]}>{monthLabel(month)}</Text><Text style={{color:colors.mutedForeground,fontSize:11}}>Month change karein</Text></View><TouchableOpacity onPress={()=>move(1)} style={s.arrow}><Feather name="chevron-right" size={25} color={colors.primary}/></TouchableOpacity></View>
  <View style={[s.header,{backgroundColor:colors.primary}]}><Text style={[s.head,s.agencyCol]}>AGENCY</Text><Text style={[s.head,s.statusCol]}>STATUS</Text><Text style={[s.head,s.amountCol]}>BAKI</Text></View>
  {q.isLoading?<ActivityIndicator color={colors.primary} style={{margin:40}}/>:q.isError?<Text style={{color:colors.destructive,textAlign:"center",padding:25}}>Register load nahi hua.</Text>:agencies.length===0?<Text style={{color:colors.mutedForeground,textAlign:"center",padding:30}}>Is month me koi agency bill nahi hai.</Text>:agencies.map((a,i)=>{const clear=a.status==="paid",partial=a.status==="partial",statusColor=clear?colors.paid:partial?"#E59A00":colors.overdue;return <TouchableOpacity key={a.agencyId} onPress={()=>open(a)} style={[s.row,{backgroundColor:colors.card,borderColor:colors.border}]} activeOpacity={.75}><View style={[s.agencyCol,{flexDirection:"row",gap:9,alignItems:"center"}]}><Text style={[s.serial,{color:colors.mutedForeground}]}>{i+1}</Text><View style={{flex:1}}><Text style={[s.agencyName,{color:colors.foreground}]}>{a.agencyName}</Text><Text style={{color:colors.mutedForeground,fontSize:10}}>{a.totalBills} bill(s)</Text></View></View><View style={s.statusCol}><View style={[s.badge,{backgroundColor:statusColor+"18"}]}><Text style={{color:statusColor,fontSize:10,fontFamily:"Inter_700Bold"}}>{status(a)}</Text></View></View><Text style={[s.amountCol,s.amount,{color:clear?colors.paid:colors.overdue}]}>{money(a.totalRemaining)}</Text></TouchableOpacity>})}
  {!q.isLoading&&!q.isError&&<View style={[s.total,{backgroundColor:colors.foreground}]}><View><Text style={s.totalLabel}>MONTH TOTAL BAKI</Text><Text style={s.totalSub}>{total?.totalAgencies||0} agencies · {total?.totalBills||0} bills</Text></View><Text style={s.totalAmount}>{money(total?.totalRemaining||0)}</Text></View>}
 </ScrollView></View>
}
const s=StyleSheet.create({page:{flex:1},content:{padding:16,gap:10,paddingBottom:45,maxWidth:900,width:"100%",alignSelf:"center"},title:{fontSize:22,fontFamily:"Inter_700Bold",marginBottom:2},monthBar:{borderWidth:1,borderRadius:14,padding:10,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},arrow:{padding:8},month:{fontSize:18,fontFamily:"Inter_700Bold"},header:{flexDirection:"row",paddingHorizontal:12,paddingVertical:11,borderRadius:10,marginTop:5},head:{color:"#fff",fontSize:10,fontFamily:"Inter_700Bold",letterSpacing:.5},agencyCol:{flex:1.7},statusCol:{flex:.8,alignItems:"center"},amountCol:{flex:1,textAlign:"right"},row:{minHeight:70,borderWidth:1,borderRadius:12,paddingHorizontal:12,paddingVertical:12,flexDirection:"row",alignItems:"center"},serial:{fontSize:11,width:16},agencyName:{fontSize:14,fontFamily:"Inter_700Bold"},badge:{paddingHorizontal:8,paddingVertical:5,borderRadius:12},amount:{fontSize:14,fontFamily:"Inter_700Bold"},total:{marginTop:5,borderRadius:14,padding:16,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},totalLabel:{color:"rgba(255,255,255,.75)",fontSize:10,fontFamily:"Inter_700Bold",letterSpacing:.7},totalSub:{color:"rgba(255,255,255,.6)",fontSize:10,marginTop:4},totalAmount:{color:"#fff",fontSize:21,fontFamily:"Inter_700Bold"}});
