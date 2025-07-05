import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Clipboard, ScrollView, Modal, TextInput } from 'react-native'
import { mainStyle } from './Styles'
import { friendStyle } from './FriendStyles'
import { Friend } from './Types'

function SingleFriend(friend: Friend) {
  const copyUserId = async () => {
    try {
      await Clipboard.setString(friend.userid)
      Alert.alert('Copied!', 'User ID copied to clipboard')
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard')
    }
  }

  return (
    <TouchableOpacity style={friendStyle.friendItem} onPress={() => { }}>
      <View>
        <Text>{friend.email}</Text>
        <Text>{friend.userid}</Text>
      </View>
      <TouchableOpacity
        style={friendStyle.copyButton}
        onPress={copyUserId}
      >
        <Text style={friendStyle.copyButtonText}>Copy</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

export default function Friends() {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [newFriendId, setNewFriendId] = useState('')

  const fakeFriends: Friend[] = [
    {
      email: "john.doe@example.com",
      userid: "user123"
    },
    {
      email: "jane.smith@example.com",
      userid: "user456"
    },
    {
      email: "mike.wilson@example.com",
      userid: "user789"
    },
    {
      email: "sarah.jones@example.com",
      userid: "user101"
    },
    {
      email: "alex.brown@example.com",
      userid: "user202"
    },
    {
      email: "emma.davis@example.com",
      userid: "user303"
    },
    {
      email: "david.miller@example.com",
      userid: "user404"
    },
    {
      email: "lisa.garcia@example.com",
      userid: "user505"
    },
    {
      email: "tom.anderson@example.com",
      userid: "user606"
    },
    {
      email: "rachel.white@example.com",
      userid: "user707"
    },
    {
      email: "chris.taylor@example.com",
      userid: "user808"
    },
    {
      email: "amanda.clark@example.com",
      userid: "user909"
    },
    {
      email: "kevin.lee@example.com",
      userid: "user1010"
    },
    {
      email: "jessica.martin@example.com",
      userid: "user1111"
    },
    {
      email: "ryan.thompson@example.com",
      userid: "user1212"
    },
    {
      email: "sophia.rodriguez@example.com",
      userid: "user1313"
    }
  ]

  const handleAddFriend = () => {
    if (newFriendId.trim()) {
      Alert.alert('Success', `Friend with ID ${newFriendId} added!`)
      setNewFriendId('')
      setIsModalVisible(false)
    } else {
      Alert.alert('Error', 'Please enter a valid friend ID')
    }
  }

  return (
    <View style={friendStyle.container}>

      <View style={friendStyle.topContainer}>
        <Text style={mainStyle.title}>Friends</Text>

        <TouchableOpacity
          style={friendStyle.addButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Text style={friendStyle.addButtonText}>Add Friend</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {fakeFriends.map((friend, index) => (
          <SingleFriend key={friend.userid} {...friend} />
        ))}
      </ScrollView>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={friendStyle.modalOverlay}>
          <View style={friendStyle.modalContent}>
            <Text style={friendStyle.modalTitle}>Add New Friend</Text>
            <TextInput
              style={friendStyle.input}
              placeholder="Enter Friend ID"
              value={newFriendId}
              onChangeText={setNewFriendId}
              autoFocus={true}
            />
            <View style={friendStyle.modalButtons}>
              <TouchableOpacity
                style={friendStyle.cancelButton}
                onPress={() => {
                  setIsModalVisible(false)
                  setNewFriendId('')
                }}
              >
                <Text style={friendStyle.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={friendStyle.confirmButton}
                onPress={handleAddFriend}
              >
                <Text style={friendStyle.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
