import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { getAuthToken, getBaseUrl } from "@workspace/api-client-react";
import { formatDateDDMMYY } from "@/lib/dateFormat";

const fmt=(n:number)=>"₹"+n.toLocaleString("en-IN",{maximumFractionDigits:0});
const keys=["current","d1_30","d31_60","d61_90","d90plus"];
export default function Aging(){
 const colors=useColors(); const [selected,setSelected]=useState("all");
 const {data,isLoading,isError,error,refetch,isFetching}=useQuery({queryKey:["aging-report"],queryFn:async()=>{const t=await getAuthToken();const r=await fetch(`${getBaseUrl()}/api/reports/aging`,{headers:{Authorization:`Bearer ${t}`}});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||"Failed to load bill aging");return body;}});
 const invoices=(data?.invoices??[]).filter((i:any)=>selected==="all"||i.bucket===selected);
 if(isLoading)return <View style={[s.center,{backgroundColor:colors.background}]}><ActivityIndicator color={colors.primary}/></View>;
 if(isError)return <View style={[s.center,{backgroundColor:colors.background,padding:24}]}><Text style={[s.errorTitle,{color:colors.foreground}]}>Bill Aging load nahi hua</Text><Text style={[s.errorText,{color:colors.mutedForeground}]}>{(error as Error)?.message||"Server error"}</Text><TouchableOpacity onPress={()=>refetch()} style={[s.retry,{backgroundColor:colors.primary}]}><Text style={s.retryText}>{isFetching?"Retrying...":"Retry"}</Text></TouchableOpacity></View>;
 return <ScrollView style={{flex:1,backgroundColor:colors.background}} contentContainerStyle={s.content}>
  <Text style={[s.hint,{color:colors.mutedForeground}]}>Outstanding bills grouped by how long they are past due.</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
   <TouchableOpacity onPress={()=>setSelected("all")} style={[s.chip,{backgroundColor:selected==="all"?colors.primary:colors.card,borderColor:colors.border}]}><Text style={{color:selected==="all"?"#fff":colors.foreground}}>All · {(data?.invoices??[]).length}</Text></TouchableOpacity>
   {keys.map(k=><TouchableOpacity key={k} onPress={()=>setSelected(k)} style={[s.chip,{backgroundColor:selected===k?colors.primary:colors.card,borderColor:colors.border}]}><Text style={{color:selected===k?"#fff":colors.foreground}}>{data?.buckets?.[k]?.label||k} · {data?.buckets?.[k]?.count||0}</Text><Text style={{color:selected===k?"#fff":colors.mutedForeground,fontSize:11}}>{fmt(data?.buckets?.[k]?.amount||0)}</Text></TouchableOpacity>)}
  </ScrollView>
  {invoices.length===0?<View style={[s.empty,{backgroundColor:colors.card,borderColor:colors.border}]}><Text style={[s.emptyTitle,{color:colors.foreground}]}>Koi outstanding bill nahi mila</Text><Text style={[s.emptyText,{color:colors.mutedForeground}]}>Is filter me pending/partial/overdue invoice nahi hai.</Text></View>:invoices.map((i:any)=><View key={i.invoiceId} style={[s.card,{backgroundColor:colors.card,borderColor:colors.border}]}><View style={s.row}><Text style={[s.name,{color:colors.foreground}]}>{i.customerName}</Text><Text style={[s.amount,{color:colors.overdue}]}>{fmt(i.outstandingBalance)}</Text></View><Text style={{color:colors.mutedForeground}}>Bill #{i.invoiceNumber} · Due {formatDateDDMMYY(i.dueDate)}</Text><Text style={{color:i.daysPastDue>0?colors.overdue:colors.paid,marginTop:5}}>{i.daysPastDue>0?`${i.daysPastDue} days overdue`:"Not due yet"}</Text></View>)}
 </ScrollView>;
}
const s=StyleSheet.create({center:{flex:1,alignItems:"center",justifyContent:"center"},content:{padding:16,paddingBottom:50},hint:{fontSize:12,marginBottom:12},chips:{gap:8,paddingBottom:12},chip:{borderWidth:1,borderRadius:12,paddingHorizontal:12,paddingVertical:8,minWidth:90},card:{borderWidth:1,borderRadius:12,padding:14,marginBottom:8},row:{flexDirection:"row",justifyContent:"space-between",gap:10},name:{fontFamily:"Inter_600SemiBold",fontSize:14,flex:1},amount:{fontFamily:"Inter_700Bold",fontSize:15},errorTitle:{fontSize:17,fontFamily:"Inter_700Bold",marginBottom:6},errorText:{fontSize:12,textAlign:"center",marginBottom:14},retry:{paddingHorizontal:18,paddingVertical:10,borderRadius:10},retryText:{color:"#fff",fontFamily:"Inter_600SemiBold"},empty:{borderWidth:1,borderRadius:12,padding:18,alignItems:"center"},emptyTitle:{fontFamily:"Inter_600SemiBold",fontSize:14},emptyText:{fontSize:11,marginTop:4,textAlign:"center"}});
