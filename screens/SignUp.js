import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { auth } from '../FirebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const SignUp = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      Alert.alert('Success', 'User registered with Firebase!');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
  <View style={styles.linkContainer}>
  <TouchableOpacity onPress={() => navigation.navigate('AlreadyAccount')}>
    <Text style={styles.linkText}>Already have an account?</Text>
  </TouchableOpacity>
</View>

    <View style={styles.buttonWrapper}>
  <Button title="Sign Up" onPress={handleSignUp} />
</View>

      
      
      
    </View>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  buttonWrapper: {
    position: 'absolute',
    top: 500,         
    left: 155,           

  marginTop: 20, 
},

  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 16,
    borderRadius: 8,
  },
  linkText: {
    marginTop: 16,
    color: 'blue',
    textDecorationLine: 'underline',
  },
 linkContainer: {
  position: 'absolute',
  top: 430,         
  left: 170,           
  padding: 20,        
  backgroundColor: 'transparent', 
},
});
