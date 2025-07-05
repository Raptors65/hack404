import React, { useState } from 'react'
import { 
  View, 
  Text, 
  Image, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert 
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { mainStyle } from './Styles'

interface Attraction {
  place_id: string
  name: string
  photo_url: string
  average_rating: number
}

interface ReviewDetailProps {
  route: {
    params: {
      attraction: Attraction
    }
  }
  navigation: any
}

export default function ReviewDetail({ route, navigation }: ReviewDetailProps) {
  const { attraction } = route.params
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const renderStars = (rating: number, interactive: boolean = false) => {
    return Array.from({ length: 10 }, (_, i) => (
      <TouchableOpacity
        key={i}
        onPress={interactive ? () => setRating(i + 1) : undefined}
        disabled={!interactive}
      >
        <Ionicons 
          name={i < rating ? "star" : "star-outline"} 
          size={24} 
          color="#FFD700" 
        />
      </TouchableOpacity>
    ))
  }

  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating before submitting')
      return
    }

    setSubmitting(true)
    try {
      // Mock API call - replace with actual endpoint
      const reviewData = {
        user_id: '1', // Replace with actual user ID
        place_id: attraction.place_id,
        score: rating,
        comment: comment.trim() || null
      }

      console.log('Submitting review:', reviewData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      Alert.alert(
        'Success!', 
        'Your review has been posted successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      )
    } catch (error) {
      console.error('Error submitting review:', error)
      Alert.alert('Error', 'Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: attraction.photo_url }} style={styles.heroImage} />
      
      <View style={styles.content}>
        <Text style={styles.attractionName}>{attraction.name}</Text>
        
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>Your Rating</Text>
          <View style={styles.starsContainer}>
            {renderStars(rating, true)}
          </View>
          <Text style={styles.ratingText}>
            {rating > 0 ? `${rating}/10` : 'Tap to rate'}
          </Text>
        </View>

        <View style={styles.commentSection}>
          <Text style={styles.sectionTitle}>Your Review (Optional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Share your experience with this place..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={submitReview}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Posting...' : 'Post Review'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  heroImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  content: {
    padding: 20,
  },
  attractionName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  ratingSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    fontWeight: '500',
  },
  commentSection: {
    marginBottom: 32,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#f9f9f9',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
}) 