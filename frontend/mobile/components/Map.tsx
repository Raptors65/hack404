import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert,
  Dimensions,
} from 'react-native'
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'

interface ReviewedPlace {
  place_id: string
  place_name: string
  rating: number
  comment: string
  latitude: number
  longitude: number
  created_at: string
}

const { width, height } = Dimensions.get('window')

export default function Map() {
  const [reviewedPlaces, setReviewedPlaces] = useState<ReviewedPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.7749, // Default to San Francisco
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  })

  useEffect(() => {
    loadReviewedPlaces()
  }, [])

  // Refresh data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadReviewedPlaces()
    }, [])
  )

  const loadReviewedPlaces = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('http://127.0.0.1:5001/user/reviewed-places', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()
      
      if (response.ok) {
        setReviewedPlaces(result.places || [])
        
        // If user has reviewed places, center map on their locations
        if (result.places && result.places.length > 0) {
          const latitudes = result.places.map((place: ReviewedPlace) => place.latitude)
          const longitudes = result.places.map((place: ReviewedPlace) => place.longitude)
          
          const minLat = Math.min(...latitudes)
          const maxLat = Math.max(...latitudes)
          const minLng = Math.min(...longitudes)
          const maxLng = Math.max(...longitudes)
          
          const centerLat = (minLat + maxLat) / 2
          const centerLng = (minLng + maxLng) / 2
          
          // Calculate deltas with some padding
          const latDelta = Math.max(0.02, (maxLat - minLat) * 1.3)
          const lngDelta = Math.max(0.02, (maxLng - minLng) * 1.3)
          
          setMapRegion({
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: latDelta,
            longitudeDelta: lngDelta,
          })
        }
      } else {
        Alert.alert('Error', `Failed to load reviewed places: ${JSON.stringify(result)}`)
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
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
    return `${Math.floor(diffInDays / 365)} years ago`
  }

  const getMarkerColor = (rating: number) => {
    if (rating >= 8) return '#34C759' // Green for high ratings
    if (rating >= 6) return '#FF9500' // Orange for medium ratings
    return '#FF3B30' // Red for low ratings
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your map...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Travel Map</Text>
      
      {reviewedPlaces.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No places reviewed yet</Text>
          <Text style={styles.emptySubtitle}>
            Start rating places during your trips to see them appear on your map!
          </Text>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
            provider={PROVIDER_GOOGLE}
          >
            {reviewedPlaces.map((place, index) => (
              <Marker
                key={`${place.place_id}-${index}`}
                coordinate={{
                  latitude: place.latitude,
                  longitude: place.longitude,
                }}
              >
                <View style={[styles.customMarker, { backgroundColor: getMarkerColor(place.rating) }]}>
                  <Text style={styles.markerText}>{place.rating}</Text>
                </View>
                <Callout style={styles.callout}>
                  <View style={styles.calloutContent}>
                    <Text style={styles.calloutTitle}>{place.place_name}</Text>
                    <Text style={styles.calloutRating}>
                      ★ {place.rating}/10
                    </Text>
                    {place.comment && (
                      <Text style={styles.calloutComment}>
                        "{place.comment}"
                      </Text>
                    )}
                    <Text style={styles.calloutDate}>
                      Reviewed {formatTimeAgo(place.created_at)}
                    </Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  mapContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  map: {
    flex: 1,
    minHeight: height * 0.6,
  },
  callout: {
    width: 200,
  },
  calloutContent: {
    padding: 8,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  calloutRating: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '600',
    marginBottom: 4,
  },
  calloutComment: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  calloutDate: {
    fontSize: 12,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  customMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
})
