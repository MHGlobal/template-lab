#pragma once
#include "MainWindow.g.h"
#include <vector>
#include <string>
#include <utility>
#include <windows.h>

namespace winrt::RSScreenManagerUI::implementation {
 struct MainWindow : MainWindowT<MainWindow> {
  MainWindow();
  ~MainWindow();

  void WelcomeNext_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Root_SizeChanged(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::SizeChangedEventArgs const&);
  void Root_Loaded(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Home_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Devices_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void MirrorPage_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void VirtualPage_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Gaming_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Mapper_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Profiles_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Diagnostics_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Settings_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void History_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Help_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);

  void Refresh_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Mirror_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Virtual_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Stop_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void OpenWindowsWifi_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void ScanHotspot_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void HotspotInterface_Changed(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::Controls::SelectionChangedEventArgs const&);
  void EnableUsbTcpip_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void ConnectHotspot_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Pair_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Connect_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Disconnect_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Advanced_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void ApplyProfile_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Screenshot_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void RefreshRecordings_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void OpenSelectedRecording_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void OpenRecordings_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void StopMirrorSelected_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void StopVirtualSelected_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void Maintenance_Tick(Windows::Foundation::IInspectable const&, Windows::Foundation::IInspectable const&);
  void AdvancedSettings_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void CloseAdvanced_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void ClipboardPC_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void ClipboardAndroid_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void ClipboardMode_Changed(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::Controls::SelectionChangedEventArgs const&);
  void SaveAdvanced_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void RefreshApps_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void LaunchMode_Changed(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::Controls::SelectionChangedEventArgs const&);
  void Resolution_Changed(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::Controls::SelectionChangedEventArgs const&);
  void SaveSettings_Click(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::RoutedEventArgs const&);
  void DeviceSelection_Changed(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::Controls::SelectionChangedEventArgs const&);
  void ListSelection_Changed(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::Controls::SelectionChangedEventArgs const&);
  void GridSelection_Changed(Windows::Foundation::IInspectable const&, Microsoft::UI::Xaml::Controls::SelectionChangedEventArgs const&);

 private:
  std::vector<std::wstring> serials_;
  std::vector<std::wstring> appPackages_;
  std::vector<std::wstring> hotspotGateways_;
  bool hotspotBusy_=false;
  bool refreshBusy_=false;
  uint64_t appScanGeneration_=0;
  bool pendingInitialRestore_=false;
  bool pendingNetworkReconnect_=false;
  std::vector<std::wstring> deviceStates_;
  struct Session {
   PROCESS_INFORMATION process{};
   std::wstring serial;
   bool virtualDisplay=false;
   bool recording=false;
   std::wstring recordingFile;
   std::wstring appTarget;
   int resolutionIndex=0;
   int clipboardIndex=0;
  };
  std::vector<Session> sessions_;
  Microsoft::UI::Xaml::DispatcherTimer maintenanceTimer_{nullptr};
  std::wstring history_;
  std::vector<std::wstring> recordings_;
  bool loaded_=false;
  bool lastNarrow_=false;
  bool lastHeroHidden_=false;
  bool lastBreadcrumbHidden_=false;
  bool lastChipHidden_=false;
  int onboardingStep_=0;
  bool syncing_=false;

  void navigate(int page);
  void updateResponsive(double width);
  void refresh();
  winrt::fire_and_forget refreshAsync(std::wstring endpoint);
  void applyDeviceOutput(const std::wstring& output);
  winrt::fire_and_forget hotspotScanAsync();
  winrt::fire_and_forget hotspotAdbAsync(std::wstring arguments,std::wstring endpoint,bool tcpip);
  void hotspotBusy(bool busy);
  void start(bool virtualDisplay);
  void startFor(const std::wstring& serial,bool virtualDisplay,bool save,const std::wstring& overrideTarget=L"",int overrideResolution=-1,int overrideClipboard=-1);
  void command(const std::wstring& args);
  void saveSettings();
  void refreshInstalledApps();
  winrt::fire_and_forget refreshInstalledAppsAsync(std::wstring serial,std::wstring previousPackage,uint64_t generation);
  std::wstring captureAdbOutput(const std::wstring& args,DWORD timeoutMs=8000);
  void updateLaunchInputs();
  void loadSettings();
  void saveSessions();
  void stopAt(size_t index);
  void reapExitedSessions();
  void refreshSessionLists();
  void updateActionAvailability();
  void refreshRecordings();
  std::wstring recordingsPath() const;
  std::wstring newMediaPath(const wchar_t* extension) const;
  void restoreSessions();
  void updateSummary();
  std::wstring settingsPath() const;
  std::wstring tools(const wchar_t* file) const;
  std::wstring selected();
  std::wstring option(Microsoft::UI::Xaml::Controls::ComboBox const& combo) const;
  void status(const wchar_t* message);
 };
}
namespace winrt::RSScreenManagerUI::factory_implementation {
 struct MainWindow : MainWindowT<MainWindow, implementation::MainWindow> {};
}
