import React from 'react'
import { View, Text, StyleSheet, Image } from 'react-native'
import { Session } from '@supabase/supabase-js'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Icon from 'react-native-vector-icons/Ionicons'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Feed from './Feed'
import PastTrips from './PastTrips'
import Trip from './Trip'
import Map from './Map'
import Profile from './Profile'

interface MainProps {
  session: Session
}

const Tab = createBottomTabNavigator()

export default function Main({ session }: MainProps) {
  const insets = useSafeAreaInsets()
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../assets/wander-logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string

            if (route.name === 'Feed') {
              iconName = focused ? 'home' : 'home-outline'
            } else if (route.name === 'PastTrips') {
              iconName = focused ? 'time' : 'time-outline'
            } else if (route.name === 'Trip') {
              iconName = focused ? 'airplane' : 'airplane-outline'
            } else if (route.name === 'Map') {
              iconName = focused ? 'map' : 'map-outline'
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline'
            } else {
              iconName = 'help-outline'
            }

            return <Icon name={iconName} size={size} color={color} />
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#E5E5EA',
            paddingBottom: Math.max(5, insets.bottom - 35),
            paddingTop: 5,
            height: 60 + Math.max(5, insets.bottom - 35),
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        })}
      >
        <Tab.Screen name="Feed" component={Feed} />
        <Tab.Screen 
          name="PastTrips" 
          component={PastTrips}
          options={{ title: 'Past Trips' }}
        />
        <Tab.Screen 
          name="Trip" 
          component={Trip}
          options={{ title: 'Trip' }}
        />
        <Tab.Screen name="Map" component={Map} />
        <Tab.Screen 
          name="Profile" 
          children={() => <Profile session={session} />}
        />
      </Tab.Navigator>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  logo: {
    height: 40,
    width: undefined,
    aspectRatio: undefined,
    alignSelf: 'center',
  },
})
