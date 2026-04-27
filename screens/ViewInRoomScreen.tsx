/**
 * ViewInRoomScreen.tsx - Perfect Ratio, 5M Reference Scaling & Zoom & Big Room
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

// --- AYARLANABİLİR PARAMETRELER (YENİ GÖRSEL: view_in_room_3.png) ---
const IMG_WIDTH = 4096;
const IMG_HEIGHT = 2232;
const IMG_ASPECT = IMG_WIDTH / IMG_HEIGHT;

// --- GERÇEK DÜNYA OPTİK & PERSPEKTİF DEĞERLERİ (NORMAL ODA) ---
const REAL_DOOR_HEIGHT_CM = 210; // Kullanıcının belirttiği referans kapı boyu
const REAL_WALL_WIDTH_CM = 500;  // Kapının sağındaki duvar genişliği
const CAMERA_DISTANCE_M = 2;     // Duvara olan izleme mesafesi (2 Metre)

// 2D Piksel Tahminleri (Normal Oda):
const DOOR_HEIGHT_IN_IMAGE_PCT = 0.72; 
const DOOR_RIGHT_EDGE_PCT = 0.20;

// --- GERÇEK DÜNYA OPTİK & PERSPEKTİF DEĞERLERİ (BÜYÜK GALERİ ODASI) ---
const BIG_WALL_WIDTH_CM = 2000;
const BIG_WALL_HEIGHT_CM = 1000;
const BIG_CAMERA_DISTANCE_M = 10;
// Büyük oda için duvarın dikeyde tahmini kapladığı alan (%70 varsayıldı)
const BIG_WALL_HEIGHT_IN_IMAGE_PCT = 0.70;
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

  const artworkWidthCm = dimensions?.width || 60;
  const artworkHeightCm = dimensions?.height || (dimensions?.width ? dimensions.width : 80);
  const artworkDepthCm = 2;

  // Genişliği 5m'den (500cm) veya yüksekliği 2.1m'den (210cm) büyük olanlar için büyük odayı kullan
  const isBigArtwork = artworkWidthCm > 500 || artworkHeightCm > 210;

  let pixelsPerCm = 0;
  let artworkLeftPx = 0;
  let artworkTopPx = 0;

  if (isBigArtwork) {
    // 2. Optik Piksel Haritalaması (Büyük Oda Kalibrasyonu)
    const bigWallPixelHeight = renderHeight * BIG_WALL_HEIGHT_IN_IMAGE_PCT;
    
    // 1 cm = X piksel oranı (Duvarın 10m = 1000cm olmasından)
    const basePixelsPerCm = bigWallPixelHeight / BIG_WALL_HEIGHT_CM;
    const perspectiveRatio = 10.0 / BIG_CAMERA_DISTANCE_M; // 10 / 10 = 1.0
    pixelsPerCm = basePixelsPerCm * perspectiveRatio;

    const artworkWidthPx = artworkWidthCm * pixelsPerCm;
    const artworkHeightPx = artworkHeightCm * pixelsPerCm;

    // 3. Duvar ve Merkezi Konumlandırma (Büyük Oda)
    // Doğrudan ekranın ortasına
    artworkLeftPx = (renderWidth / 2) - (artworkWidthPx / 2);
    artworkTopPx = (renderHeight / 2) - (artworkHeightPx / 2);

  } else {
    // 2. Optik Piksel Haritalaması (Normal Oda Kalibrasyonu)
    const doorPixelHeight = renderHeight * DOOR_HEIGHT_IN_IMAGE_PCT;
    
    const basePixelsPerCm = doorPixelHeight / REAL_DOOR_HEIGHT_CM;
    const perspectiveRatio = 2.0 / CAMERA_DISTANCE_M; 
    pixelsPerCm = basePixelsPerCm * perspectiveRatio;

    const artworkWidthPx = artworkWidthCm * pixelsPerCm;
    const artworkHeightPx = artworkHeightCm * pixelsPerCm;

    // 3. Duvar ve Merkezi Konumlandırma (Normal Oda)
    const wallWidthPx = REAL_WALL_WIDTH_CM * pixelsPerCm;
    const wallStartX = renderWidth * DOOR_RIGHT_EDGE_PCT;
    const wallCenterXPx = wallStartX + (wallWidthPx / 2);

    artworkLeftPx = wallCenterXPx - (artworkWidthPx / 2);
    artworkTopPx = (renderHeight * 0.45) - (artworkHeightPx / 2); 
  }

  const artworkWidthPx = artworkWidthCm * pixelsPerCm;
  const artworkHeightPx = artworkHeightCm * pixelsPerCm;
  
  // Standart bir derinlik (kalınlık) varsayarak gölge (duvardan çıkıntı) miktarını dinamik belirliyoruz
  const dynamicShadowOffset = Math.min(Math.max(artworkDepthCm * 3, 5), 30);
  const dynamicShadowRadius = Math.min(Math.max(artworkDepthCm * 2, 5), 25);

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
              source={isBigArtwork ? require('../assets/view_in_room_big.jpg') : require('../assets/view_in_room_3.jpg')}
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
                resizeMode="stretch" // Ebatlar ne girildiyse görseli ona zorla (180x60 ise tam 180x60 dikdörtgen olur)
              />
              <View 
                style={[
                  styles.artworkShadow, 
                  { 
                    shadowOffset: { width: dynamicShadowOffset * 0.5, height: dynamicShadowOffset },
                    shadowRadius: dynamicShadowRadius
                  }
                ]} 
              />
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
    shadowOpacity: 0.7,
    elevation: 20,
    zIndex: 1,
  },
});
