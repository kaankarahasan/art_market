import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../routes/types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { gyroscope, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';

const { width, height } = Dimensions.get('window');

type ARMockupScreenRouteProp = RouteProp<RootStackParamList, 'ARMockup'>;

const ARMockupScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ARMockupScreenRouteProp>();
  const { imageUrl } = route.params;

  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [isActive, setIsActive] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const isLockedRef = useRef(false); // To use inside gyro listener

  // Gesture Values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  
  // Gyroscope tracking values (Virtual World coordinates)
  const gyroX = useSharedValue(0);
  const gyroY = useSharedValue(0);

  useEffect(() => {
    (async () => {
      if (!hasPermission) {
        const result = await requestPermission();
        if (!result) {
          Alert.alert(
            'Kamera İzni Gerekli',
            'Sanal ortamda eseri görüntüleyebilmeniz için kamera erişimine ihtiyacımız var. Lütfen ayarlardan kameraya izin verin.',
            [
              { text: 'İptal', style: 'cancel', onPress: () => navigation.goBack() },
              {
                text: 'Ayarlar',
                onPress: () => {
                  Linking.openSettings();
                  navigation.goBack();
                },
              },
            ],
            { cancelable: false }
          );
        }
      }
    })();
  }, [hasPermission, requestPermission, navigation]);

  // Gyroscope 3-DOF Tracking
  useEffect(() => {
    let subscription: any = null;

    const startGyro = () => {
      try {
        setUpdateIntervalForType(SensorTypes.gyroscope, 20); // 50hz (20ms) for ultra-smooth
        
        subscription = gyroscope.subscribe(({ x, y, z }) => {
          if (isLockedRef.current) {
            // SENSITIVITY CALIBRATION:
            // In Portrait Android: 
            // x = tilt up/down (rotates screen content up/down)
            // y = tilt left/right (rotates screen content left/right)
            // z = rotation like a steering wheel
            
            const dt = 0.020; 
            const pixelsPerRad = width * 2.5; // More aggressive tracking
            
            // Integrate movement
            // NOTE: We invert to "fix" it in space while phone moves
            gyroX.value -= (y * dt * pixelsPerRad);
            gyroY.value -= (x * dt * pixelsPerRad);
          }
        });
      } catch (err) {
        console.warn('Gyroscope sensor error:', err);
      }
    };

    startGyro();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const toggleLock = () => {
    isLockedRef.current = !isLockedRef.current;
    setIsLocked(isLockedRef.current);
    if (!isLockedRef.current) {
      gyroX.value = withSpring(0);
      gyroY.value = withSpring(0);
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 0.2) {
        scale.value = withSpring(0.2);
        savedScale.value = 0.2;
      } else if (scale.value > 5) {
        scale.value = withSpring(5);
        savedScale.value = 5;
      } else {
        savedScale.value = scale.value;
      }
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const rStyle = useAnimatedStyle(() => {
    const finalTransX = translateX.value + gyroX.value;
    const finalTransY = translateY.value + gyroY.value;
    
    // Calculate rotation based on DISTANCE from screen center to simulate perspective
    // AS you move phone away from center, it tilts
    const rotY = (finalTransX / width) * 0.8; // max ~0.8 rad (~45 deg)
    const rotX = (-finalTransY / height) * 0.8;

    return {
      transform: [
        { perspective: 1200 },
        { translateX: finalTransX },
        { translateY: finalTransY },
        { rotateY: `${rotY}rad` },
        { rotateX: `${rotX}rad` },
        { scale: scale.value },
      ],
    };
  });

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'white' }}>Kamera izni bekleniyor...</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'white' }}>Kamera cihazı bulunamadı!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        photo={false}
        video={false}
        audio={false}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            setIsActive(false);
            navigation.goBack();
          }}
        >
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          {isLocked 
            ? "Duvara sabitlendi! Telefonunuzu sağa sola çevrildiğinizde eser duvarda asılı kalacaktır." 
            : "Eseri istediğiniz konuma sürükleyin, ardından 'Duvara Sabitle' butonuna basın."}
        </Text>
      </View>
      
      <View style={styles.lockButtonContainer}>
        <TouchableOpacity 
          style={[styles.lockButton, isLocked && styles.lockButtonActive]} 
          onPress={toggleLock}
        >
          <Ionicons name={isLocked ? "lock-closed" : "lock-open"} size={22} color="white" />
          <Text style={styles.lockButtonText}>{isLocked ? "Kilidi Aç" : "Duvara Sabitle"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.overlayContainer} pointerEvents="box-none">
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.artworkWrapper, rStyle]}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.artworkImage}
              resizeMode="contain"
            />
            {/* Gölgelendirme */}
            <View style={styles.artworkShadow} />
          </Animated.View>
        </GestureDetector>
      </View>

    </View>
  );
};

export default ARMockupScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  center: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
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
  instructionContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
  lockButtonContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#444',
  },
  lockButtonActive: {
    backgroundColor: '#007AFF', // Blue color when locked
    borderColor: '#005BBB',
  },
  lockButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkWrapper: {
    width: width * 0.6,
    height: width * 0.6,
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
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 20,
    zIndex: 1,
  },
});
