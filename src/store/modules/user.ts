import {defineStore} from 'pinia'
import {GET_TOKEN, REMOVE_TOKEN} from '@/utils/auth.ts';
import {getUserInfo, UserInfo} from "@/apis/user";

const useUserStore = defineStore('user', () => {
    const token = GET_TOKEN()
    const userInfo = shallowRef<UserInfo>()

    // 获取用户信息
    const getInfo = async () => {
        getUserInfo().then((res: any) => {
            if (res.code === 200) {
                userInfo.value = res.data
            } else if (res.code === 1002) {
                // token失效，删除token
                REMOVE_TOKEN()
                userInfo.value = undefined
            }
        })
    }

    return {
        token,
        userInfo,
        getInfo
    }
})

export default useUserStore;
