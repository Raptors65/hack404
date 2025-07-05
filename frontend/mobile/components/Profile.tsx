import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert 
} from 'react-native'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Friend {
  friend_id: string
  friend_email: string
  friendship_created: string
}

interface ProfileProps {
  session: Session
}

export default function Profile({ session }: ProfileProps) {
  const [friendEmail, setFriendEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [loadingFriends, setLoadingFriends] = useState(false)

  useEffect(() => {
    loadFriends()
  }, [])

  const loadFriends = async () => {
    setLoadingFriends(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('http://127.0.0.1:5001/friends', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()
      
      if (response.ok) {
        setFriends(result.friends || [])
      } else {
        Alert.alert('Error', `Failed to load friends: ${JSON.stringify(result)}`)
      }
    } catch (error) {
      Alert.alert('Error', `Network error: ${error}`)
    } finally {
      setLoadingFriends(false)
    }
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      Alert.alert('Error', error.message)
    }
  }

  const handleAddFriend = async () => {
    if (!friendEmail.trim()) {
      Alert.alert('Error', 'Please enter a friend\'s email')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        Alert.alert('Error', 'Not authenticated')
        return
      }

      const response = await fetch('http://127.0.0.1:5001/add_friend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          friend_email: friendEmail
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        Alert.alert('Success', 'Friend added successfully!')
        setFriendEmail('')
        loadFriends() // Refresh friends list
      } else {
        Alert.alert('Error', JSON.stringify(result))
      }
    } catch (error) {
      Alert.alert('Error', `Network error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        
        <View style={styles.userInfo}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.email}>{session.user.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Friend</Text>
          <TextInput
            style={styles.input}
            placeholder="Friend's email address"
            value={friendEmail}
            onChangeText={setFriendEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity 
            style={[styles.button, styles.addButton]}
            onPress={handleAddFriend}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Adding...' : 'Add Friend'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friends ({friends.length})</Text>
          {loadingFriends ? (
            <Text style={styles.loadingText}>Loading friends...</Text>
          ) : friends.length === 0 ? (
            <Text style={styles.emptyText}>No friends yet. Add some friends to get started!</Text>
          ) : (
            friends.map((friend) => (
              <View key={friend.friend_id} style={styles.friendItem}>
                <Text style={styles.friendEmail}>{friend.friend_email}</Text>
                <Text style={styles.friendDate}>
                  Added {new Date(friend.friendship_created).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity 
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  userInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#007AFF',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  friendItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  friendDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
})