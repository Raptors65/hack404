import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity,
  Alert,
  Image
} from 'react-native'
import { supabase } from '../lib/supabase'

interface Trip {
  id: number
  city: string
  country: string
  start_date: string
  created_at: string
}

interface Recommendation {
  name: string
  description: string
  category: string
  rating: number
  image_url: string
}

interface PopularDestination {
  city: string
  country: string
  image_url: string
  description: string
}

export default function Trip() {
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null)
  const [hasActiveTrip, setHasActiveTrip] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchCity, setSearchCity] = useState('')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  
  const popularDestinations: PopularDestination[] = [
    {
      city: 'New York',
      country: 'United States',
      image_url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=250&fit=crop',
      description: 'The city that never sleeps'
    },
    {
      city: 'Paris',
      country: 'France',
      image_url: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=400&h=250&fit=crop',
      description: 'City of lights and romance'
    },
    {
      city: 'Tokyo',
      country: 'Japan',
      image_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=250&fit=crop',
      description: 'Modern meets traditional'
    },
    {
      city: 'London',
      country: 'United Kingdom',
      image_url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=250&fit=crop',
      description: 'Rich history and culture'
    }
  ]

  useEffect(() => {
    checkCurrentTrip()
  }, [])

  const checkCurrentTrip = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('http://127.0.0.1:5001/trip/current', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()
      
      if (response.ok) {
        setHasActiveTrip(result.has_active_trip)
        if (result.has_active_trip) {
          setCurrentTrip(result.trip)
          loadRecommendations(result.trip.city)
        }
      } else {
        Alert.alert('Error', `Failed to check current trip: ${JSON.stringify(result)}`)
      }
    } catch (error) {
      Alert.alert('Error', `Network error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const loadRecommendations = async (city: string) => {
    setLoadingRecommendations(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`http://127.0.0.1:5001/trip/recommendations?city=${encodeURIComponent(city)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()
      
      if (response.ok) {
        setRecommendations(result.recommendations || [])
      } else {
        Alert.alert('Error', `Failed to load recommendations: ${JSON.stringify(result)}`)
      }
    } catch (error) {
      Alert.alert('Error', `Network error: ${error}`)
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const startTrip = async (city: string, country?: string) => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('http://127.0.0.1:5001/trip/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          city: city,
          country: country
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        Alert.alert('Success', `Started trip to ${city}!`)
        setCurrentTrip(result.trip)
        setHasActiveTrip(true)
        setSearchCity('')
        loadRecommendations(city)
      } else {
        Alert.alert('Error', JSON.stringify(result))
      }
    } catch (error) {
      Alert.alert('Error', `Network error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const endTrip = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('http://127.0.0.1:5001/trip/end', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()
      
      if (response.ok) {
        Alert.alert('Success', 'Trip ended successfully!')
        setCurrentTrip(null)
        setHasActiveTrip(false)
        setRecommendations([])
      } else {
        Alert.alert('Error', JSON.stringify(result))
      }
    } catch (error) {
      Alert.alert('Error', `Network error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchTrip = () => {
    if (!searchCity.trim()) {
      Alert.alert('Error', 'Please enter a city name')
      return
    }
    startTrip(searchCity.trim())
  }

  const handlePopularDestination = (destination: PopularDestination) => {
    startTrip(destination.city, destination.country)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {hasActiveTrip && currentTrip ? (
          // Active trip view
          <View>
            <Text style={styles.title}>Current Trip</Text>
            <View style={styles.currentTripCard}>
              <Text style={styles.currentTripCity}>{currentTrip.city}</Text>
              {currentTrip.country && (
                <Text style={styles.currentTripCountry}>{currentTrip.country}</Text>
              )}
              <Text style={styles.currentTripDate}>
                Started {new Date(currentTrip.start_date).toLocaleDateString()}
              </Text>
              <TouchableOpacity 
                style={styles.endTripButton}
                onPress={endTrip}
                disabled={loading}
              >
                <Text style={styles.endTripButtonText}>End Trip</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Recommended Places</Text>
            {loadingRecommendations ? (
              <Text style={styles.loadingText}>Loading recommendations...</Text>
            ) : (
              <View style={styles.recommendationsContainer}>
                {recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationCard}>
                    <Image 
                      source={{ uri: rec.image_url }} 
                      style={styles.recommendationImage}
                    />
                    <View style={styles.recommendationInfo}>
                      <Text style={styles.recommendationName}>{rec.name}</Text>
                      <Text style={styles.recommendationCategory}>{rec.category}</Text>
                      <Text style={styles.recommendationDescription}>{rec.description}</Text>
                      <Text style={styles.recommendationRating}>★ {rec.rating}/5</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          // No active trip view
          <View>
            <Text style={styles.title}>Start a Trip</Text>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search Destinations</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Enter a city name"
                value={searchCity}
                onChangeText={setSearchCity}
                autoCapitalize="words"
              />
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={handleSearchTrip}
                disabled={loading}
              >
                <Text style={styles.searchButtonText}>
                  {loading ? 'Starting...' : 'Start Trip'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popular Destinations</Text>
              <View style={styles.popularContainer}>
                {popularDestinations.map((dest, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.popularCard}
                    onPress={() => handlePopularDestination(dest)}
                    disabled={loading}
                  >
                    <Image 
                      source={{ uri: dest.image_url }} 
                      style={styles.popularImage}
                    />
                    <View style={styles.popularOverlay}>
                      <Text style={styles.popularCity}>{dest.city}</Text>
                      <Text style={styles.popularCountry}>{dest.country}</Text>
                      <Text style={styles.popularDescription}>{dest.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  popularContainer: {
    gap: 16,
  },
  popularCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  popularImage: {
    width: '100%',
    height: 200,
  },
  popularOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
  },
  popularCity: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  popularCountry: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  popularDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  currentTripCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  currentTripCity: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  currentTripCountry: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  currentTripDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  endTripButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  endTripButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recommendationsContainer: {
    gap: 16,
  },
  recommendationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recommendationImage: {
    width: '100%',
    height: 160,
  },
  recommendationInfo: {
    padding: 16,
  },
  recommendationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recommendationCategory: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  recommendationRating: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
  },
})