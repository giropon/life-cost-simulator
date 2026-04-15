import { useState } from 'react'
import type { TabKey } from './types'
import Header from './components/layout/Header'
import TabNav from './components/layout/TabNav'
import FixedCostSection from './components/fixed-costs/FixedCostSection'
import WeeklyScheduleSection from './components/weekly-schedule/WeeklyScheduleSection'
import MonthlyEventsSection from './components/events/MonthlyEventsSection'
import AnnualEventsSection from './components/events/AnnualEventsSection'
import IrregularEventsSection from './components/events/IrregularEventsSection'
import IncomeSection from './components/income/IncomeSection'
import SummarySection from './components/summary/SummarySection'

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('fixed')

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <TabNav active={activeTab} onChange={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'fixed' && <FixedCostSection />}
        {activeTab === 'weekly' && <WeeklyScheduleSection />}
        {activeTab === 'monthly' && <MonthlyEventsSection />}
        {activeTab === 'annual' && <AnnualEventsSection />}
        {activeTab === 'irregular' && <IrregularEventsSection />}
        {activeTab === 'income' && <IncomeSection />}
        {activeTab === 'summary' && <SummarySection />}
      </main>
    </div>
  )
}

export default App
