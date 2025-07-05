import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Session } from '@supabase/supabase-js'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Icon from 'react-native-vector-icons/Ionicons'
import Feed from './Feed'
import PastTrips from './PastTrips'
import NewTrip from './NewTrip'
import Map from './Map'
import Profile from './Profile'

interface MainProps {
  session: Session
}

const Tab = createBottomTabNavigator()

export default function Main({ session }: MainProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wander</Text>
      </View>
      
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string

            if (route.name === 'Feed') {
              iconName = focused ? 'home' : 'home-outline'
            } else if (route.name === 'PastTrips') {
              iconName = focused ? 'time' : 'time-outline'
            } else if (route.name === 'NewTrip') {
              iconName = focused ? 'add-circle' : 'add-circle-outline'
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
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
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
          name="NewTrip" 
          component={NewTrip}
          options={{ title: 'New Trip' }}
        />
        <Tab.Screen name="Map" component={Map} />
        <Tab.Screen 
          name="Profile" 
          children={() => <Profile session={session} />}
        />
      </Tab.Navigator>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
})
