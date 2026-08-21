import React from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { medpayApi } from "@/lib/medpayApi";
import { formatDateDDMMYY } from "@/lib/dateFormat";

const money=(n:number)=>`₹${Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}`;
type Bill={id:number;invoiceNumber:string;invoiceDate:string;billAmount:number;paidAmount:number;remainingAmount:number;paymentDate?:string;slipNumber?:string;storeName:string};

export default function AgencyBills(){
 const p=useLocalSearchParams<{agencyId:string;agencyName:string;month:string}>(),colors=useColors(),router=useRouter(),{width}=useWindowDimensions();
 const desktop=Platform.OS==="web"&&width>=900;
 const q=useQuery({queryKey:["global-agency-register",p.agencyId,p.month],queryFn:()=>medpayApi<{bills:Bill[]}>(`/api/monthly-register/agency/${p.agencyId}?month=${p.month}`)});
 const bills=q.data?.bills||[];
 return <View style={[s.page,{backgroundColor:colors.background}]}><ScrollView contentContainerStyle={[s.content,desktop&&s.desktopContent]}>
  <Text style={[s.title,{color:colors.foreground}]}>{p.agencyName}</Text>
  <Text style={[s.subtitle,{color:colors.mutedForeground}]}>{new Date(`${p.month}-01`).toLocaleDateString("en-IN",{month:"long",year:"numeric"})} · All Medical Stores</Text>
  {q.isLoading?<ActivityIndicator color={colors.primary} style={{margin:35}}/>:!bills.length?<Text style={{color:colors.mutedForeground,padding:30,textAlign:"center"}}>No bills</Text>:<>
   {desktop&&<View style={[s.header,{backgroundColor:colors.primary}]}>{["S.No","Medical Store","Bill No","Bill Date","Amount","Paid","Baki"].map((x,i)=><Text key={x} style={[s.headCell,i===0&&s.serial]}>{x}</Text>)}</View>}
   {bills.map((b,i)=><TouchableOpacity key={b.id} onPress={()=>router.push(`/invoice/${b.id}`)} activeOpacity={.75} style={[desktop?s.row:s.card,{backgroundColor:colors.card,borderColor:colors.border}]}>
    {desktop?<><Text style={[s.cell,s.serial]}>{i+1}</Text><Text style={[s.cell,s.strong,{color:colors.foreground}]}>{b.storeName}</Text><Text style={s.cell}>{b.invoiceNumber}</Text><Text style={s.cell}>{formatDateDDMMYY(b.invoiceDate)}</Text><Text style={s.cell}>{money(b.billAmount)}</Text><Text style={[s.cell,{color:colors.paid}]}>{money(b.paidAmount)}</Text><Text style={[s.cell,{color:b.remainingAmount?colors.overdue:colors.paid}]}>{money(b.remainingAmount)}</Text></>:
    <><View style={s.cardTop}><View style={{flex:1}}><Text style={[s.store,{color:colors.foreground}]}>{i+1}. {b.storeName}</Text><Text style={[s.billMeta,{color:colors.mutedForeground}]}>Bill #{b.invoiceNumber} · {formatDateDDMMYY(b.invoiceDate)}</Text></View><Text style={[s.billAmount,{color:colors.foreground}]}>{money(b.billAmount)}</Text></View><View style={[s.divider,{backgroundColor:colors.border}]}/><View style={s.amountRow}><View><Text style={[s.smallLabel,{color:colors.mutedForeground}]}>PAID</Text><Text style={[s.amountValue,{color:colors.paid}]}>{money(b.paidAmount)}</Text></View><View style={{alignItems:"flex-end"}}><Text style={[s.smallLabel,{color:colors.mutedForeground}]}>BAKI</Text><Text style={[s.amountValue,{color:b.remainingAmount?colors.overdue:colors.paid}]}>{money(b.remainingAmount)}</Text></View></View><View style={[s.paymentInfo,{backgroundColor:colors.background}]}><Text style={{color:colors.mutedForeground,fontSize:11}}>Payment Date: {b.paymentDate?formatDateDDMMYY(b.paymentDate):"—"}</Text><Text style={{color:colors.mutedForeground,fontSize:11}}>Slip No: {b.slipNumber||"—"}</Text></View></>}
   </TouchableOpacity>)}
  </>}
 </ScrollView></View>
}
const s=StyleSheet.create({page:{flex:1},content:{padding:16,gap:10,paddingBottom:40},desktopContent:{maxWidth:1200,width:"100%",alignSelf:"center"},title:{fontSize:22,fontFamily:"Inter_700Bold"},subtitle:{fontSize:13,marginBottom:5},header:{flexDirection:"row",borderRadius:10,padding:13},headCell:{flex:1,color:"#fff",fontSize:12,fontFamily:"Inter_700Bold"},serial:{flex:.45},row:{flexDirection:"row",borderWidth:1,borderRadius:10,padding:14,alignItems:"center"},cell:{flex:1,fontSize:12},strong:{fontFamily:"Inter_600SemiBold"},card:{borderWidth:1,borderRadius:15,padding:15,gap:11},cardTop:{flexDirection:"row",alignItems:"flex-start",gap:10},store:{fontSize:15,fontFamily:"Inter_700Bold"},billMeta:{fontSize:12,marginTop:4},billAmount:{fontSize:16,fontFamily:"Inter_700Bold"},divider:{height:1},amountRow:{flexDirection:"row",justifyContent:"space-between"},smallLabel:{fontSize:9,fontFamily:"Inter_700Bold",letterSpacing:.7},amountValue:{fontSize:16,fontFamily:"Inter_700Bold",marginTop:3},paymentInfo:{borderRadius:9,padding:9,flexDirection:"row",justifyContent:"space-between",gap:8}});
