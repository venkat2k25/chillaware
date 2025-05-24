import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import Header from "../layouts/Header";
import Colors from "../utils/Colors";

export default function HomeScreen() {
  const features = [
    {
      title: "Image Processing",
      description: "Scan invoices to automatically extract inventory items using OCR (Optical Character Recognition). Simply take a photo of your receipt and let our AI do the work.",
      icon: "📱",
      benefits: ["Automatic item detection", "Save time on manual entry", "Reduce human error"]
    },
    {
      title: "Recipe Generation", 
      description: "Generate personalized recipes based on your available inventory items. Never wonder what to cook again with smart recipe suggestions.",
      icon: "👨‍🍳",
      benefits: ["Personalized suggestions", "Reduce food waste", "Discover new dishes"]
    },
    {
      title: "Inventory Management",
      description: "Keep track of your inventory items and get notified about expiration dates. Stay organized and never let food go to waste.",
      icon: "📦",
      benefits: ["Expiration alerts", "Organized tracking", "Smart notifications"]
    }
  ];

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>🍽️</Text>
          </View>
          <Text style={styles.heroTitle}>Smart Kitchen Manager</Text>
          <Text style={styles.heroSubtitle}>
            Transform your kitchen experience with AI-powered inventory management, 
            smart recipe generation, and automated invoice scanning.
          </Text>
          <Text style={styles.heroDescription}>
            Say goodbye to food waste and hello to organized, efficient cooking.
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Powerful Features</Text>
          <Text style={styles.sectionSubtitle}>
            Everything you need to manage your kitchen inventory and discover amazing recipes
          </Text>
          
          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
                
                <View style={styles.benefitsList}>
                  {feature.benefits.map((benefit, idx) => (
                    <View key={idx} style={styles.benefitItem}>
                      <Text style={styles.benefitBullet}>✓</Text>
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* How It Works Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <Text style={styles.sectionSubtitle}>
            Get started in three simple steps
          </Text>
          
          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Scan Your Receipt</Text>
                <Text style={styles.stepDescription}>
                  Take a photo of your grocery receipt. Our OCR technology will automatically 
                  extract all items and add them to your inventory.
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Manage Your Inventory</Text>
                <Text style={styles.stepDescription}>
                  Track expiration dates, organize items by category, and receive 
                  smart notifications before items expire.
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Discover Recipes</Text>
                <Text style={styles.stepDescription}>
                  Get personalized recipe suggestions based on what you have. 
                  Cook delicious meals and reduce food waste.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Benefits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose Smart Kitchen?</Text>
          
          <View style={styles.benefitsGrid}>
            <View style={styles.benefitCard}>
              <Text style={styles.benefitCardIcon}>💰</Text>
              <Text style={styles.benefitCardTitle}>Save Money</Text>
              <Text style={styles.benefitCardText}>
                Reduce food waste by up to 30% with smart expiration tracking
              </Text>
            </View>

            <View style={styles.benefitCard}>
              <Text style={styles.benefitCardIcon}>⏰</Text>
              <Text style={styles.benefitCardTitle}>Save Time</Text>
              <Text style={styles.benefitCardText}>
                Automatic inventory management eliminates manual data entry
              </Text>
            </View>

            <View style={styles.benefitCard}>
              <Text style={styles.benefitCardIcon}>🎯</Text>
              <Text style={styles.benefitCardTitle}>Stay Organized</Text>
              <Text style={styles.benefitCardText}>
                Keep track of everything in your kitchen with ease
              </Text>
            </View>

            <View style={styles.benefitCard}>
              <Text style={styles.benefitCardIcon}>🍳</Text>
              <Text style={styles.benefitCardTitle}>Cook Smarter</Text>
              <Text style={styles.benefitCardText}>
                Discover new recipes tailored to your available ingredients
              </Text>
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to Transform Your Kitchen?</Text>
          <Text style={styles.ctaSubtitle}>
            Join thousands of users who have already revolutionized their cooking experience
          </Text>
          <TouchableOpacity style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>Get Started Today</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingTop: 80,
    paddingHorizontal: 15,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 20,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary || '#3498DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroEmoji: {
    fontSize: 40,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text || '#2C3E50',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 18,
    color: Colors.textSecondary || '#7F8C8D',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 16,
    color: Colors.textSecondary || '#7F8C8D',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Section Styles
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text || '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary || '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  // Features
  featuresContainer: {
    gap: 24,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text || '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 15,
    color: Colors.textSecondary || '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  benefitsList: {
    alignSelf: 'stretch',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitBullet: {
    fontSize: 14,
    color: Colors.primary || '#3498DB',
    fontWeight: 'bold',
    marginRight: 8,
  },
  benefitText: {
    fontSize: 14,
    color: Colors.text || '#2C3E50',
    flex: 1,
  },

  // Steps
  stepsContainer: {
    gap: 24,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary || '#3498DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text || '#2C3E50',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    color: Colors.textSecondary || '#7F8C8D',
    lineHeight: 22,
  },

  // Benefits Grid
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  benefitCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  benefitCardIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  benefitCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text || '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  benefitCardText: {
    fontSize: 13,
    color: Colors.textSecondary || '#7F8C8D',
    textAlign: 'center',
    lineHeight: 18,
  },

  // CTA Section
  ctaSection: {
    backgroundColor: Colors.primary || '#3498DB',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 22,
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary || '#3498DB',
  },
});