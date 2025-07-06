import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity,
  Alert,
  Image,
  Modal
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
  place_id: string
  name: string
  description: string
  category: string
  rating: number
  user_ratings_total: number
  image_url: string
  location: {
    lat: number
    lng: number
  }
  friends_who_liked: Array<{
    id: string
    name: string
    email: string
    rating: number
  }>
  friend_indicator: string | null
  user_rating?: number | null
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
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<Recommendation | null>(null)
  const [userRating, setUserRating] = useState(0)
  const [userComment, setUserComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  // Helper function to format numbers with thousands separators
  const formatNumber = (num: number): string => {
    return num.toLocaleString()
  }
  
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

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/trip/current`, {
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

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/trip/recommendations?city=${encodeURIComponent(city)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()
      
      if (response.ok) {
        const recommendationsWithUserRatings = await Promise.all(
          (result.recommendations || []).map(async (rec: Recommendation) => {
            try {
              // Check if user has already rated this place
              const userRatingResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/get_user_rating?place_id=${encodeURIComponent(rec.place_id)}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
              })
              
              const userRatingResult = await userRatingResponse.json()
              
              return {
                ...rec,
                user_rating: userRatingResult.has_rating ? userRatingResult.rating : null
              }
            } catch (error) {
              // If error checking user rating, just return the recommendation without user rating
              return { ...rec, user_rating: null }
            }
          })
        )
        
        setRecommendations(recommendationsWithUserRatings)
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

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/trip/start`, {
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

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/trip/end`, {
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

  const handleRecommendationPress = async (recommendation: Recommendation) => {
    // Prevent rating if user has already rated this place
    if (recommendation.user_rating !== null && recommendation.user_rating !== undefined) {
      Alert.alert(
        'Already Rated', 
        `You've already rated this place ${recommendation.user_rating}/10. Ratings cannot be changed once submitted.`,
        [{ text: 'OK' }]
      )
      return
    }

    setSelectedPlace(recommendation)
    setUserRating(0)
    setUserComment('')
    setShowRatingModal(true)
  }

  const submitRating = async () => {
    if (!selectedPlace || userRating === 0) {
      Alert.alert('Error', 'Please select a rating')
      return
    }

    setSubmittingRating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/rate_place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          place_id: selectedPlace.place_id,
          place_name: selectedPlace.name,
          rating: userRating,
          comment: userComment,
          latitude: selectedPlace.location.lat,
          longitude: selectedPlace.location.lng
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        Alert.alert('Success', result.message)
        setShowRatingModal(false)
        setSelectedPlace(null)
        setUserRating(0)
        setUserComment('')
        
        // Refresh recommendations to update friend indicators
        if (currentTrip) {
          loadRecommendations(currentTrip.city)
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to submit rating')
      }
    } catch (error) {
      Alert.alert('Error', `Network error: ${error}`)
    } finally {
      setSubmittingRating(false)
    }
  }

  const closeRatingModal = () => {
    setShowRatingModal(false)
    setSelectedPlace(null)
    setUserRating(0)
    setUserComment('')
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
                  <TouchableOpacity 
                    key={index} 
                    style={[
                      styles.recommendationCard,
                      rec.user_rating !== null && styles.recommendationCardRated
                    ]}
                    onPress={() => handleRecommendationPress(rec)}
                  >
                    <Image 
                      source={{ uri: rec.image_url }} 
                      style={styles.recommendationImage}
                    />
                    <View style={styles.recommendationInfo}>
                      <Text style={styles.recommendationName}>{rec.name}</Text>
                      <Text style={styles.recommendationCategory}>{rec.category}</Text>
                      <Text style={styles.recommendationDescription}>{rec.description}</Text>
                      <View style={styles.recommendationFooter}>
                        <Text style={styles.recommendationRating}>
                          ★ {rec.rating ? rec.rating.toFixed(1) : 'N/A'}
                          {rec.user_ratings_total && rec.user_ratings_total > 0 && (
                            ` (${formatNumber(rec.user_ratings_total)} reviews)`
                          )}
                        </Text>
                        {rec.user_rating !== null ? (
                          <Text style={styles.userRatedText}>
                            You rated: {rec.user_rating}/10
                          </Text>
                        ) : (
                          <Text style={styles.tapToRate}>Tap to rate</Text>
                        )}
                      </View>
                      {rec.friend_indicator && (
                        <Text style={styles.friendIndicator}>
                          👥 {rec.friend_indicator}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
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
      
      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeRatingModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate this place</Text>
              <TouchableOpacity onPress={closeRatingModal} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            {selectedPlace && (
              <View style={styles.modalContent}>
                <Text style={styles.modalPlaceName}>{selectedPlace.name}</Text>
                <Text style={styles.modalPlaceCategory}>{selectedPlace.category}</Text>
                
                <Text style={styles.ratingLabel}>Your Rating (1-10):</Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={[
                        styles.ratingButton,
                        userRating === rating && styles.ratingButtonSelected
                      ]}
                      onPress={() => setUserRating(rating)}
                    >
                      <Text style={[
                        styles.ratingButtonText,
                        userRating === rating && styles.ratingButtonTextSelected
                      ]}>
                        {rating}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.commentLabel}>Comment (optional):</Text>
                <TextInput
                  style={styles.commentInput}
                  value={userComment}
                  onChangeText={setUserComment}
                  placeholder="Share your thoughts about this place..."
                  multiline
                  numberOfLines={3}
                />
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeRatingModal}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.submitButton, submittingRating && styles.submitButtonDisabled]}
                    onPress={submitRating}
                    disabled={submittingRating || userRating === 0}
                  >
                    <Text style={styles.submitButtonText}>
                      {submittingRating ? 'Submitting...' : 'Submit Rating'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  recommendationCardRated: {
    backgroundColor: '#f8f9ff',
    borderWidth: 2,
    borderColor: '#007AFF',
    opacity: 0.8,
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
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tapToRate: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  userRatedText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  friendIndicator: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 0,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  modalPlaceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  modalPlaceCategory: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  ratingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  ratingButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  ratingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ratingButtonTextSelected: {
    color: '#fff',
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
})