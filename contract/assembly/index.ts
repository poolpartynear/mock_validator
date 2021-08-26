import {storage, context, env, u128, ContractPromiseBatch, logging} from "near-sdk-as";
import {user_to_idx, user_staked, user_unstaking, User} from "./model"

export function get_account(account_id: string): User{
  logging.log("MYPOOL: GETACCOUNT")
  if(!user_to_idx.contains(account_id)){
    return new User(u128.Zero, u128.Zero, true)
  }

  const idx:i32 = user_to_idx.getSome(account_id)
  const staked:u128 = user_staked[idx]
  const unstaking:u128 = user_unstaking[idx]

  return new User(unstaking, staked, true)
}

export function deposit_and_stake():void{
  logging.log("MYPOOL: DEPOSIT")

  if(user_to_idx.contains(context.predecessor)){
    let idx:i32 = user_to_idx.getSome(context.predecessor)
    user_staked[idx] = user_staked[idx] + context.attachedDeposit + context.attachedDeposit
  }else{
    const N:i32 = storage.getPrimitive<i32>('total_users', 0)
    storage.set<i32>('total_users', N+1)
    
    user_to_idx.set(context.predecessor, N)
    user_staked.push(context.attachedDeposit + context.attachedDeposit)
    user_unstaking.push(u128.Zero)
  }
}

export function withdraw_all():void{
  logging.log("MYPOOL: WITHDRAW ALL")
  if(!user_to_idx.contains(context.predecessor)){return}

  let idx:i32 = user_to_idx.getSome(context.predecessor)

  if(user_unstaking[idx] <= u128.Zero){return}

  ContractPromiseBatch.create(context.predecessor).transfer(user_unstaking[idx])
  user_unstaking[idx] = u128.Zero
}

export function unstake(amount:u128):void{
  logging.log("MYPOOL: UNSTACKING")
  if(!user_to_idx.contains(context.predecessor)){return}

  let idx:i32 = user_to_idx.getSome(context.predecessor)

  let staked:u128 = user_staked[idx]

  if(amount > staked){return}

  // update User
  user_staked[idx] = user_staked[idx] - amount
  user_unstaking[idx] = user_unstaking[idx] + amount
}
