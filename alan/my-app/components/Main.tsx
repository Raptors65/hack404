import { View, Text } from 'react-native'
import { Session } from '@supabase/supabase-js'
import Footer from './Footer'
import { TabType } from './Types'
import { useState } from 'react'    
import Home from './Home'
import Friends from './Friends'
import Plan from './Plan'
import Map from './Map'
import Review from './Review'
import ReviewDetail from './ReviewDetail'
import { mainStyle } from './Styles'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

interface MainProps {
  session: Session
}

const Stack = createNativeStackNavigator()

function ReviewStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ReviewList" 
        component={Review} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ReviewDetail" 
        component={ReviewDetail} 
        options={{ 
          title: 'Write Review',
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#333',
        }}
      />
    </Stack.Navigator>
  )
}

export default function Main({ session }: MainProps) {
  const [activeTab, setActiveTab] = useState<TabType>('home')

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab)
  }

  const controller = () => {
    switch (activeTab) {
      case 'home':
        return <Home />
      case 'friends':
        return <Friends />
      case 'plan':
        return <Plan />
      case 'map':
        return <Map />
      case 'review':
        return <ReviewStack />
    }
  }

  return (
    <View style={{ flex: 1, width: '100%', backgroundColor: '#ffffff' }}>
      
    <Text style={{ fontSize: 14, fontWeight: '500' }}>
        {session.user.email}
    </Text>

      <View style={mainStyle.container}>
        {controller()}
      </View>
      <Footer activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  )
}
