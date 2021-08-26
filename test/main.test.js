describe('PoolParty', function () {
  let near
  let contract_A, contract_B, contract_C
  let user_A, user_B, user_C

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

  beforeAll(async function () {
    user_A = 'test-account-1625088444921-3359490'
    user_B = 'test-account-1625088423773-5983746'
    user_C = 'test-account-1625088405590-3197214'

    near = await nearlib.connect(nearConfig);
    accountId = nearConfig.contractName;

    function create_contract(user){
      return near.loadContract(nearConfig.contractName, {
        viewMethods: ['get_account'],
        changeMethods: ['deposit_and_stake', 'unstake', 'withdraw_all'],
        sender: user
      })
    }

    contract_A = await create_contract(user_A)
    contract_B = await create_contract(user_B)
    contract_C = await create_contract(user_C)

    get_account_balance = async function(accountId){
       let acc = await near.account(accountId)
       let balance = await acc.getAccountBalance()
       balance.total = parseFloat(nearlib.utils.format.formatNearAmount(balance.total))
       balance.available = parseFloat(nearlib.utils.format.formatNearAmount(balance.available))
       return balance
    }

    deposit_and_stake = async function(amount, contract){
      amount = nearAPI.utils.format.parseNearAmount(amount.toString())
      return await contract.account.functionCall(
        nearConfig.contractName, 'deposit_and_stake', {}, 0, amount
      )
    }

    unstake = async function(amount, contract){
      amount = nearAPI.utils.format.parseNearAmount(amount.toString())
      return await contract.unstake({amount:amount})
    }

    withdraw_all = async function(contract){
      return await contract.withdraw_all()
    }

    get_account = async function(accountId, contract=contract_A){
      let info = await contract.get_account({account_id:accountId})
      info.unstaked_balance = parseFloat(
          nearlib.utils.format.formatNearAmount(info.unstaked_balance)
      )
      info.staked_balance = parseFloat(nearlib.utils.format.formatNearAmount(info.staked_balance))
      return info 
    }

  });

  describe('Pool', function () {
    it("responds empty user for non existing users", async function(){
      let info = await get_account("non-existent-user")
      expect(info.staked_balance).toBe(0, "non-user has staked_balance")
      expect(info.unstaked_balance).toBe(0, "non-user is unstaked_balance")
    })

    it("correctly add staked_balance to new users", async function(){
      let user_A_info = await get_account(user_A)
      
      // User A buys staked_balance
      await deposit_and_stake(5, contract_A)

      // Check it updated correctly
      let up_user_A_info = await get_account(user_A)

      expect(up_user_A_info.staked_balance).toBe(10, "staked_balance B wrong")
      expect(up_user_A_info.unstaked_balance).toBe(0, "A unstaked_balance changed")
    });

    it("correctly add more staked_balance to existing users", async function(){
      // Users buy staked_balance
      await deposit_and_stake(5, contract_A)
      await deposit_and_stake(0.1, contract_C)
      await deposit_and_stake(2.123, contract_B)

      // get info
      user_A_info = await get_account(user_A)
      user_B_info = await get_account(user_B)
      user_C_info = await get_account(user_C)

      const infos = [user_A_info, user_B_info, user_C_info]
      const staked_balance = [20, 4.246, 0.2]

      for(i=0; i<3; i++){
        expect(infos[i].staked_balance).toBe(staked_balance[i])
        expect(infos[i].unstaked_balance).toBe(0)
      }
    })

    it("correctly unstakes money", async function(){
      let response = await unstake(1, contract_A)

      // only A should have changed
      user_A_info = await get_account(user_A)
      user_B_info = await get_account(user_B)
      user_C_info = await get_account(user_C)

      const infos = [user_A_info, user_B_info, user_C_info]
      const staked_balance = [19, 4.246, 0.2]
      const unstaked_balance = [1, 0, 0]

      for(i=0; i<3; i++){
        expect(infos[i].staked_balance).toBe(staked_balance[i])
        expect(infos[i].unstaked_balance).toBe(unstaked_balance[i])
      }
    })

    it("can claim money unstaked", async function(){
      balance = await get_account_balance(user_A)
      await withdraw_all(contract_A)
    
      new_balance = await get_account_balance(user_A)
      expect(new_balance.total - balance.total).toBeCloseTo(0.99, 2)
    })
  });
});
