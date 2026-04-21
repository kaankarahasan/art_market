/**
 * ViewInRoomScreen.tsx - Perfect Ratio, 5M Reference Scaling & Zoom
 */
import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../routes/types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

// --- AYARLANABİLİR PARAMETRELER (YENİ GÖRSEL: view_in_room_2.png) ---
const IMG_WIDTH = 4096;
const IMG_HEIGHT = 2232;
const IMG_ASPECT = IMG_WIDTH / IMG_HEIGHT;

// Kapının sağında kalan duvarın genişliği (cm)
// 2 metre uzaklıktan çekilmiş orantısı, 5 metrelik duvar içindeki piksellere zaten gömülüdür.
const REFERENCE_DISTANCE_CM = 500; 

// Resimde kapıdan sağa doğru uzanan boş beyaz duvarın tahmini başlangıç ve bitiş yüzdeleri:
// %100 = resmin tam genşliği. Resmi kendi panelinizde inceleyerek duvarın yerini bu değerlerle tam oturtun.
const WALL_LEFT_PCT = 0.25;  // Kapı pervazının bittiği ve duvarın başladığı yer (Örn: %25)
const WALL_RIGHT_PCT = 0.95; // Sağ köşedeki sınır (Örn: %95)
// ----------------------------------

type ViewInRoomRouteProp = RouteProp<RootStackParamList, 'ViewInRoom'>;

const ViewInRoomScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ViewInRoomRouteProp>();
  const { imageUrl, dimensions } = route.params;
  
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // 1. Ekran boyutuna göre arka plan resminin "tam sığacak" piksellerini bulalım
  const screenAspect = screenWidth / screenHeight;
  let renderWidth = screenWidth;
  let renderHeight = screenHeight;

  if (screenAspect > IMG_ASPECT) {
    renderHeight = screenHeight;
    renderWidth = renderHeight * IMG_ASPECT;
  } else {
    renderWidth = screenWidth;
    renderHeight = renderWidth / IMG_ASPECT;
  }

  // 2. Piksel -> CM oranını 5 Metrelik duvarın resim içindeki pikselleri üzerinden ayarla
  const pixelDistance = renderWidth * (WALL_RIGHT_PCT - WALL_LEFT_PCT);
  const pixelsPerCm = pixelDistance / REFERENCE_DISTANCE_CM;

  // 3. Eserin boyutlarını piksele çevir
  const artworkWidthCm = dimensions?.width || 60;
  const artworkHeightCm = dimensions?.height || (dimensions?.width ? dimensions.width : 80);

  const artworkWidthPx = artworkWidthCm * pixelsPerCm;
  const artworkHeightPx = artworkHeightCm * pixelsPerCm;

  // 4. "Kapının sağında kalan duvarın tam ortası"
  const centerX_PCT = (WALL_LEFT_PCT + WALL_RIGHT_PCT) / 2;

  const artworkLeftPx = (renderWidth * centerX_PCT) - (artworkWidthPx / 2);
  // Y ekseni göz hizasında (Resmin dikey olarak yaklaşık ortası)
  const artworkTopPx = (renderHeight * 0.45) - (artworkHeightPx / 2); 

  // --- ZOOM ve PAN (SÜRÜKLEME) MATEMATİĞİ ---
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // İki parmakla yakınlaştırma hareketi
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e: any) => {
      // Skalayı 0.8 ile 5 arasında sınırla
      scale.value = Math.max(0.8, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      // Çok uzaklaştırılmışsa eski haline (1x) zıplatarak geri getir
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Ekranda gezinme (Pan) hareketi
  const panGesture = Gesture.Pan()
    // Sadece zoom yapılmışsa çalışsın
    .minPointers(1)
    .onUpdate((e: any) => {
      if (scale.value > 1.0) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      if (scale.value > 1.0) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  // Çift tıklayarak zoom yap veya ilk haline dön
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        // Geri al
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        // İçeri gitsin
        scale.value = withSpring(2);
        savedScale.value = 2;
      }
    });

  // Hepsini kombinle (Pinch ve Pan aynı anda kullanılabilir)
  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Zoom Katmanı */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.zoomContainer, animatedStyle]}>
          
          <View style={{ width: renderWidth, height: renderHeight, overflow: 'hidden' }}>
            <Image
              source={require('../assets/view_in_room_2.jpg')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover" 
            />

            <View 
              style={{
                position: 'absolute',
                left: artworkLeftPx,
                top: artworkTopPx,
                width: artworkWidthPx,
                height: artworkHeightPx,
              }}
              pointerEvents="none"
            >
              <Image
                source={{ uri: imageUrl }}
                style={styles.artworkImage}
                resizeMode="contain"
              />
              <View style={styles.artworkShadow} />
            </View>
          </View>
          
        </Animated.View>
      </GestureDetector>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
      </View>

    </View>
  );
};

export default ViewInRoomScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 25 : 20, 
    left: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  artworkShadow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 20,
    zIndex: 1,
  },
});
