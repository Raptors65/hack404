import { View, Text } from 'react-native'
import { Session } from '@supabase/supabase-js'
import Footer, { TabType } from './Footer'
import { useState } from 'react'    
import Home from './Home'
import Friends from './Friends'
import Plan from './Plan'
import Map from './Map'
import Review from './Review'
import { mainStyle } from './Styles'

interface MainProps {
  session: Session
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
        return <Review />
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
