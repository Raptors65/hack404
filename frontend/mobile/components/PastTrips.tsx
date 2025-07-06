import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'

interface PastTrip {
  id: number
  city: string
  country: string
  start_date: string
  end_date: string
  created_at: string
  review_count: number
  duration_days: number | null
  average_rating: number | null
}

export default function PastTrips() {
  const [pastTrips, setPastTrips] = useState<PastTrip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPastTrips()
  }, [])

  // Refresh data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadPastTrips()
    }, [])
  )

  const loadPastTrips = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/trip/past`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()
      
      if (response.ok) {
        setPastTrips(result.past_trips || [])
      } else {
        Alert.alert('Error', `Failed to load past trips: ${JSON.stringify(result)}`)
      }
    } catch (error) {
      Alert.alert('Error', `Network error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateRange = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : null
    
    if (!end) {
      return formatDate(startDate)
    }
    
    const startFormatted = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
    
    const endFormatted = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
    
    return `${startFormatted} - ${endFormatted}`
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your past trips...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Past Trips</Text>
        
        {pastTrips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No past trips yet</Text>
            <Text style={styles.emptySubtitle}>
              Start your first trip to see your travel memories here!
            </Text>
          </View>
        ) : (
          <View style={styles.tripsContainer}>
            {pastTrips.map((trip, index) => (
              <View key={trip.id} style={styles.tripCard}>
                <View style={styles.tripHeader}>
                  <Text style={styles.tripCity}>{trip.city}</Text>
                  {trip.country && (
                    <Text style={styles.tripCountry}>{trip.country}</Text>
                  )}
                </View>
                
                <Text style={styles.tripDates}>
                  {formatDateRange(trip.start_date, trip.end_date)}
                </Text>
                
                <View style={styles.tripStats}>
                  {trip.duration_days && (
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{trip.duration_days}</Text>
                      <Text style={styles.statLabel}>
                        {trip.duration_days === 1 ? 'day' : 'days'}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{trip.review_count}</Text>
                    <Text style={styles.statLabel}>
                      {trip.review_count === 1 ? 'place rated' : 'places rated'}
                    </Text>
                  </View>
                  
                  {trip.average_rating && (
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, styles.ratingNumber]}>★ {trip.average_rating}</Text>
                      <Text style={styles.statLabel}>avg rating</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
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
  tripsContainer: {
    gap: 16,
  },
  tripCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tripHeader: {
    marginBottom: 8,
  },
  tripCity: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tripCountry: {
    fontSize: 16,
    color: '#666',
  },
  tripDates: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 16,
    fontWeight: '500',
  },
  tripStats: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  ratingNumber: {
    color: '#FF9500',
  },
})