export async function deleteAccountData({getUser,reauthenticate,beginDelete,listBatch,deleteBatch,deleteUser}){
 const user=getUser();if(!user)throw Error('먼저 로그인해 주세요.');
 const same=()=>{if(getUser()!==user)throw Error('계정이 변경되어 삭제를 중단했어요.');};
 await reauthenticate(user);same();
 await beginDelete(user.uid);same();
 while(true){same();const rows=await listBatch(user.uid);same();if(!rows.length)break;await deleteBatch(rows);same();}
 same();await deleteUser(user);
}
