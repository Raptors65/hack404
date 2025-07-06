import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Alert,
  FlatList
} from 'react-native'
import { supabase } from '../lib/supabase'

interface FeaturedList {
  id: string
  title: string
  description: string
  image_url: string
  place_count: number
}

interface FriendActivity {
  type: 'review' | 'trip'
  id: string
  user_id: string
  user_name: string
  user_email: string
  created_at: string
  // Review specific fields
  place_id?: string
  place_name?: string
  rating?: number
  comment?: string
  // Trip specific fields
  city?: string
  country?: string
  start_date?: string
  end_date?: string
}

export default function Feed() {
  const [featuredLists, setFeaturedLists] = useState<FeaturedList[]>([])
  const [friendActivity, setFriendActivity] = useState<FriendActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFeedData()
  }, [])

  const loadFeedData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/feed`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()
      
      if (response.ok) {
        setFeaturedLists(result.featured_lists || [])
        setFriendActivity(result.friend_activity || [])
      } else {
        Alert.alert('Error', `Failed to load feed: ${JSON.stringify(result)}`)
      }
    } catch (error) {
      Alert.alert('Error', `Network error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    const diffInWeeks = Math.floor(diffInDays / 7)
    return `${diffInWeeks}w ago`
  }

  const renderFeaturedList = ({ item }: { item: FeaturedList }) => (
    <TouchableOpacity style={styles.featuredCard}>
      <Image source={{ uri: item.image_url }} style={styles.featuredImage} />
      <View style={styles.featuredOverlay}>
        <Text style={styles.featuredTitle}>{item.title}</Text>
        <Text style={styles.featuredDescription}>{item.description}</Text>
        <Text style={styles.featuredCount}>{item.place_count} places</Text>
      </View>
    </TouchableOpacity>
  )

  const renderActivityItem = (activity: FriendActivity) => {
    if (activity.type === 'review') {
      return (
        <View key={activity.id} style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {activity.user_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityUserName}>{activity.user_name}</Text>
              <Text style={styles.activityTime}>{formatTimeAgo(activity.created_at)}</Text>
            </View>
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>
              Rated {activity.place_name || 'a place'} {activity.rating}/10
            </Text>
            {activity.comment && (
              <Text style={styles.activityComment}>"{activity.comment}"</Text>
            )}
          </View>
        </View>
      )
    } else {
      return (
        <View key={activity.id} style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {activity.user_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityUserName}>{activity.user_name}</Text>
              <Text style={styles.activityTime}>{formatTimeAgo(activity.created_at)}</Text>
            </View>
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>
              Completed a trip to {activity.city}
              {activity.country && `, ${activity.country}`}
            </Text>
            {activity.start_date && activity.end_date && (
              <Text style={styles.activityDates}>
                {new Date(activity.start_date).toLocaleDateString()} - {new Date(activity.end_date).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
      )
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading feed...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Feed</Text>
        
        {/* Featured Lists Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Lists</Text>
          <FlatList
            data={featuredLists}
            renderItem={renderFeaturedList}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredContainer}
          />
        </View>

        {/* Friend Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {friendActivity.length > 0 ? (
            <View style={styles.activityContainer}>
              {friendActivity.map(renderActivityItem)}
            </View>
          ) : (
            <Text style={styles.placeholder}>
              No recent activity from friends. Add some friends to see their travel updates!
            </Text>
          )}
        </View>
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
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  featuredContainer: {
    paddingRight: 20,
  },
  featuredCard: {
    width: 250,
    height: 150,
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  featuredDescription: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  featuredCount: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  activityContainer: {
    gap: 16,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activityInfo: {
    flex: 1,
  },
  activityUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activityContent: {
    paddingLeft: 52,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  activityComment: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  activityDates: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  placeholder: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
  },
})