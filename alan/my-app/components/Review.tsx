import React, { useState, useEffect } from 'react'
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { mainStyle } from './Styles'

interface Attraction {
  place_id: string
  name: string
  photo_url: string
  average_rating: number
}

interface ReviewProps {
  navigation: any
}

export default function Review({ navigation }: ReviewProps) {
  const [attractions, setAttractions] = useState<Attraction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAttractions()
  }, [])

  const fetchAttractions = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockAttractions: Attraction[] = [
        {
          place_id: '1',
          name: 'Eiffel Tower',
          photo_url: 'https://images.unsplash.com/photo-1502602898534-47d3c0c0b8b8?w=400',
          average_rating: 4.5
        },
        {
          place_id: '2',
          name: 'Louvre Museum',
          photo_url: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=400',
          average_rating: 4.2
        },
        {
          place_id: '3',
          name: 'Notre-Dame Cathedral',
          photo_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400',
          average_rating: 4.7
        }
      ]
      setAttractions(mockAttractions)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching attractions:', error)
      setLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons 
        key={i} 
        name={i < Math.floor(rating) ? "star" : i < rating ? "star-half" : "star-outline"} 
        size={16} 
        color="#FFD700" 
      />
    ))
  }

  const renderAttraction = ({ item }: { item: Attraction }) => (
    <TouchableOpacity 
      style={styles.attractionCard}
      onPress={() => navigation.navigate('ReviewDetail', { attraction: item })}
    >
      <Image source={{ uri: item.photo_url }} style={styles.attractionImage} />
      <View style={styles.attractionInfo}>
        <Text style={styles.attractionName}>{item.name}</Text>
        <View style={styles.ratingContainer}>
          <View style={styles.stars}>
            {renderStars(item.average_rating)}
          </View>
          <Text style={styles.ratingText}>{item.average_rating.toFixed(1)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading attractions...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={mainStyle.title}>Reviews</Text>
      <FlatList
        data={attractions}
        renderItem={renderAttraction}
        keyExtractor={(item) => item.place_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  attractionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  attractionImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  attractionInfo: {
    flex: 1,
  },
  attractionName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
}) 